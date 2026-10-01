import { includeMedicalSamples } from "./sample-preference";
import { medicalSampleAction } from "./sample-action";
import { ManagementForm } from "../management/form";
export async function MedicalSampleSelector({organizationId,manage}:{organizationId:string;manage:boolean}) {
  const included = await includeMedicalSamples(organizationId);
  return <section className="panel mb-6"><h2>試用データの選択</h2><p className="record-meta">現在：{included ? "テストデータあり" : "テストデータなし"}。医療機器の各一覧・集計に共通の設定です。切り替えても既存データは削除しません。</p><ManagementForm action={medicalSampleAction} label="表示を切り替える"><label>テストデータ<select key={included ? "include" : "exclude"} name="sampleMode" aria-label="テストデータ" defaultValue={included ? "include" : "exclude"}><option value="exclude">なし（実データのみ）</option><option value="include">あり（実データ＋架空の7台）</option></select></label><p className="record-meta">{manage ? "初めて「あり」を選ぶと、貸出・点検・修理の状態を持つ架空の7台を追加します。何度切り替えても増殖・初期化しません。" : "テスト機器の準備は管理権限のあるユーザーに依頼してください。"}「【テスト】」の機器で操作を試せます。</p></ManagementForm></section>;
}
