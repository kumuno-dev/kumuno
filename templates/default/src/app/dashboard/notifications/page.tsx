import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { getDatabase } from "@/database/client";
import { notificationList } from "@/notifications/repository";
import { notificationReadAction } from "@/notifications/actions";
import { ManagementForm } from "@/management/form";
export default async function NotificationsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const actor=await requirePermission("dashboard:read"),params=await searchParams;
  const unreadOnly=params.view==="unread",requestedPage=typeof params.page==="string"&&/^\d{1,6}$/.test(params.page)?Math.max(1,Number(params.page)):1;
  const result=await notificationList(getDatabase(),actor.organizationId,actor.id,unreadOnly,requestedPage);
  const href=(page:number)=>`/dashboard/notifications?view=${unreadOnly?"unread":"all"}&page=${page}`;
  return <><p className="eyebrow">NOTIFICATIONS</p><h1>自分の通知</h1><p className="page-description">未読{result.unread}件。現在は、あなたが行ったCSV一括登録の完了をお知らせします。</p>
    <nav className="flex flex-wrap gap-6 mb-6" aria-label="通知の表示"><Link href="/dashboard/notifications?view=all" aria-current={!unreadOnly?"page":undefined}>すべて</Link><Link href="/dashboard/notifications?view=unread" aria-current={unreadOnly?"page":undefined}>未読のみ</Link></nav>
    <section className="panel">{!result.rows.length&&<p>{unreadOnly?"未読の通知はありません。":"通知はまだありません。CSV一括登録が完了するとここに表示されます。"}</p>}
    <div className="record-list">{result.rows.map(n=><article className="record" key={n.id}><div className="record-heading"><h2>{n.title}</h2><span className="badge">{n.readAt?"既読":"未読"}</span></div><p className="break-words whitespace-pre-wrap mt-4">{n.message}</p><p className="record-meta">{n.createdAt.toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})}（日本時間）</p><Link className="underline" href={n.href}>関連画面を開く</Link>{!n.readAt&&<div className="mt-4"><ManagementForm action={notificationReadAction} label="既読にする"><input type="hidden" name="id" value={n.id}/></ManagementForm></div>}</article>)}</div>
    <nav aria-label="通知のページ切替" className="flex flex-wrap gap-6 mt-6">{result.page>1&&<Link href={href(result.page-1)}>前のページ</Link>}<span>{result.page} / {result.pages}ページ</span>{result.page<result.pages&&<Link href={href(result.page+1)}>次のページ</Link>}</nav></section></>;
}
