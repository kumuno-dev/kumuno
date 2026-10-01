import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { MedicalSampleSelector } from "@/medical-equipment/sample-selector";
import { includeMedicalSamples } from "@/medical-equipment/sample-preference";
import { medicalOverview } from "@/medical-equipment/overview";
import { availabilityLabels,type Availability } from "@/medical-equipment/availability";
import { inspectionResults } from "@/medical-equipment/inspections";
export default async function MedicalOverviewPage() {
  const actor = await requirePermission("medical-equipment:read"), included = await includeMedicalSamples(actor.organizationId);
  const result = await medicalOverview(getDatabase(),actor.organizationId,included);
  return <><p className="eyebrow">MEDICAL WORKSPACE</p><h1>医療機器ダッシュボード</h1><p className="page-description">全{result.total}台 · {included ? "テストデータを含む" : "実データのみ"}。状態別の台数から、次に対応する機器へ移動できます。</p>
    <MedicalSampleSelector organizationId={actor.organizationId} manage={can(actor,"medical-equipment:manage",actor)}/>
    <div className="overview-grid">{(Object.keys(availabilityLabels) as Availability[]).map(key=><Link className="overview-card" href={`/dashboard/medical-equipment?availability=${key}`} key={key}><h2>{availabilityLabels[key]}</h2><p className="text-3xl font-semibold" data-testid={`count-${key}`}>{result.counts[key]}台</p><span>該当する機器を見る →</span></Link>)}</div>
    {result.total === 0 && <section className="panel mt-6"><h2>運用の流れを試す</h2><p className="mt-3">テストデータ「あり」で、貸出中・点検待ち・修理中の機器が現れます。自分の機器で始める場合は、台帳から1台登録してください。</p><Link className="inline-block mt-4 text-orange-800 underline" href="/dashboard/medical-equipment">医療機器台帳へ →</Link></section>}
    <section className="panel mt-6"><h2>点検予定（{result.soon}まで）</h2><p className="record-meta">対象{result.dueTotal}台 · 期限超過{result.overdue}台。直近の点検記録の次回予定を使い、廃棄済みを除きます。早い順に最大5台を表示します。予定日は貸出可否を自動変更しません。</p>{result.upcoming.length === 0 && <p className="mt-4">この期間の点検予定はありません。</p>}{result.upcoming.map(d=><article className="record" key={d.id}><div className="record-heading"><Link className="text-orange-800 underline" href={`/dashboard/medical-equipment/${d.id}`}><h3>{d.managementNumber} · {d.name}</h3></Link><span className="badge">{d.overdue ? "期限超過" : d.next === result.today ? "本日" : "7日以内"}</span></div><p className="record-meta">予定日：{d.next} · 直近の結果：{inspectionResults[d.result]}</p></article>)}<Link className="inline-block mt-4 text-orange-800 underline" href="/dashboard/medical-inspections">点検記録一覧へ →</Link></section>
    <section className="panel mt-6"><h2>次の操作</h2><p className="mt-3">貸出可能 → 貸出 → 返却 → 合格点検 → 再貸出。修理が必要な場合は、返却後に修理を依頼し、完了・台帳の運用再開・合格点検の順に記録します。</p></section>
  </>;
}
