import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { parseCsv, CsvError } from "@kumuno/csv";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { appendAuditLog } from "../audit/log";
import { InputError } from "../management/validation";
import { parseMedicalDevice, statuses } from "./validation";
export const importMaxBytes=131072;
const columns:Record<string,string>={"機器管理番号":"managementNumber","機器名":"name","種別":"category","資産管理番号":"assetNumber","メーカー":"manufacturer","型式":"modelName","シリアル番号":"serialNumber","設置場所":"location","購入日":"purchaseDate","保証期限":"warrantyUntil","備考":"notes"};
const extra=["所属部署コード","所属部署","台帳上の状態","返却後の点検","現在の貸出先","テスト機器"];
export type ImportPreview={headers:string[];rows:string[][];errors:string[];digest:string};
async function prepare(tx:Prisma.TransactionClient,organizationId:string,csv:string){
  let records:string[][];
  try {records=parseCsv(csv,{maxBytes:importMaxBytes,maxRows:101,maxColumns:20,maxCellLength:2000});}
  catch(error){if(error instanceof CsvError)throw new InputError(`CSVの${error.row}行目・${error.column}列目の形式または上限を確認してください。`);throw error;}
  const [headers,...rows]=records;
  if(!headers || !rows.length)throw new InputError("見出しと1〜100台のデータが必要です。");
  if(new Set(headers).size!==headers.length || headers.some(h=>!Object.hasOwn(columns,h)&&!extra.includes(h)) || ["機器管理番号","機器名","種別"].some(h=>!headers.includes(h)))throw new InputError("見出しの重複・未対応列と必須列（機器管理番号・機器名・種別）を確認してください。");
  const departments=await tx.department.findMany({where:{organizationId},select:{id:true,code:true,name:true}});
  const errors:string[]=[],seen=new Set<string>();
  const data:Omit<ReturnType<typeof parseMedicalDevice>,"id">[]=[];
  for(const [i,row]of rows.entries()){
    try{
      const values=Object.fromEntries(headers.map((h,j)=>[h,row[j].trim()]));
      const number=values["機器管理番号"];
      if(seen.has(number))throw new InputError("ファイル内で機器管理番号が重複しています。");seen.add(number);
      if(values["現在の貸出先"] && values["現在の貸出先"]!=="貸出なし")throw new InputError("貸出履歴は取り込めません。現在の貸出先を空欄にしてください。");
      if(values["テスト機器"] && values["テスト機器"]!=="いいえ")throw new InputError("テスト機器は取り込めません。");
      if(values["返却後の点検"] && !["点検待ち","点検待ちではありません"].includes(values["返却後の点検"]))throw new InputError("返却後の点検の値を確認してください。");
      const code=values["所属部署コード"],name=values["所属部署"];
      const matches=code?departments.filter(d=>d.code===code):name?departments.filter(d=>d.name===name):[];
      if((code||name)&&(matches.length!==1 || (code&&name&&matches[0]?.name!==name)))throw new InputError("所属部署が見つからないか同名が複数あります。部署コードを確認してください。");
      const statusLabel=values["台帳上の状態"]||"運用中";
      const status=Object.entries(statuses).find(([,label])=>label===statusLabel)?.[0];
      if(!status)throw new InputError("台帳上の状態を確認してください。");
      const form=new FormData();for(const [label,key]of Object.entries(columns))form.set(key,values[label]??"");
      form.set("id","");form.set("departmentId",matches[0]?.id??"");form.set("status",status);
      const {id,...item}=parseMedicalDevice(form);void id;data.push(item);
    }catch(error){if(!(error instanceof InputError))throw error;errors.push(`${i+2}行目：${error.message}`);}
  }
  const numbers=data.map(d=>d.managementNumber);
  const existing=await tx.medicalDevice.findMany({where:{organizationId,managementNumber:{in:numbers}},select:{managementNumber:true}});
  const conflicts=new Set(existing.map(d=>d.managementNumber));
  for(const [i,row]of rows.entries())if(conflicts.has(row[headers.indexOf("機器管理番号")].trim()))errors.push(`${i+2}行目：機器管理番号は登録済みです。既存データは上書きしません。`);
  const digest=createHash("sha256").update(JSON.stringify({csv,data})).digest("hex");
  return {headers,rows,errors,digest,data};
}
export function issueImportToken(secret:string,actorId:string,organizationId:string,digest:string,now=Date.now()){
  const payload=Buffer.from(JSON.stringify({actorId,organizationId,digest,expires:now+600000})).toString("base64url");
  return payload+"."+createHmac("sha256",secret).update("medical-csv-import:"+payload).digest("hex");
}
function verifyToken(secret:string,token:string,actorId:string,organizationId:string,digest:string){
  try{
    if(token.length>1024)throw new Error();const [payload,signature,...rest]=token.split(".");
    const expected=createHmac("sha256",secret).update("medical-csv-import:"+payload).digest("hex");
    if(rest.length || !/^[0-9a-f]{64}$/.test(signature??"") || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new Error();
    const value=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    if(value.actorId!==actorId||value.organizationId!==organizationId||value.digest!==digest||!Number.isFinite(value.expires)||value.expires<Date.now())throw new Error();
  }catch{throw new InputError("確認内容が変更されたか期限が切れました。もう一度CSVを確認してください。");}
}
export async function previewMedicalImport(db:PrismaClient,actorId:string,organizationId:string,csv:string):Promise<ImportPreview>{
  return db.$transaction(async tx=>{await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);const {data,...preview}=await prepare(tx,organizationId,csv);void data;return preview;},{isolationLevel:"RepeatableRead"});
}
export async function importMedicalDevices(db:PrismaClient,actorId:string,organizationId:string,csv:string,token:string,secret:string){
  return db.$transaction(async tx=>{
    const actor=await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    const plan=await prepare(tx,organizationId,csv);verifyToken(secret,token,actorId,organizationId,plan.digest);
    if(plan.errors.length)throw new InputError("入力内容または台帳が変更されています。もう一度CSVを確認してください。");
    for(const item of plan.data){
      const device=await tx.medicalDevice.create({data:{...item,organizationId,returnInspectionPending:true,isSample:false}});
      await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalDevice",resourceId:device.id,after:device});
    }
    return plan.data.length;
  },{isolationLevel:"Serializable",timeout:20000});
}
