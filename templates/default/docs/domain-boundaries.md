# Domain境界とデータの所有

Organization / Department / Userと認証・認可・監査はShared Core。備品はEquipment Domain。今後追加する研修や資格もそれぞれの業務Domainが所有する。

## 共有するもの

主要Entityの内部IDはUUID v4。社員番号・コード・名前は業務属性で、参照には内部IDを使う。Organizationがデータの境界で、Departmentの親子関係とUserの所属は既存マスタを再利用する。新機能ごとのEmployee / Team / Organizationの重複マスタを作らない。

研修の受講状況や資格の期限をUserへ追加しない。新Domain側にuserIdとorganizationIdを持たせ、既存の共有マスタへ関連付ける。同じ組織への参照をDBの複合外部キーでも強制する。

## 依存の方向

Business Domainから必要なCore機能を利用する。Coreが個別業務のservice / repositoryを呼ぶ設計にはしない。Domain間の循環依存を作らず、他Domainの内部テーブルを前提にした無制限なアクセスを避ける。

実際の配置は[architecture.md](architecture.md)。備品はsrc/equipmentにまとまり、Coreへの参照と自分の備品データに責任を持つ。共通フォーム・FormData検証などの小さいUI／入力補助を再利用しても、別の業務更新を直接呼ぶ必要はない。

監査のsrc/audit/log.tsには現在リソース別スナップショットの許可リストがある。新Domainの追加時にはここへ安全な保存属性を明示できるが、業務ルール・repository import・業務更新処理は置かない。汎用拡張基盤を先に作ることも不要。

## 更新・削除・連携

単一アプリ内の外部キーは利用できる。外部キーだけを理由にAPIやイベント基盤を追加しない。共有マスタの変更はCoreの管理serviceへ集約する。個別業務の状態変更はそのDomainが行う。

他Domainのデータを利用する要件が出たときは、提供側のserviceや明示的な読み出し契約を設け、認可・監査・エラー・整合性を確認する。組織をまたぐ参照を無断で許可しない。IDを知っていることは権限ではない。

Equipmentから参照された部署・Userの物理削除はRestrictで拒否する。一般の退職処理はUser.isActive。監査は対象の削除後も履歴を保つ。新Domainも削除動作を文書化する。

## 新Domainのレビュー

追加予定の研修管理がUser / Departmentを再定義していないか、Equipmentの内部へ依存していないか、研修属性がCoreへ混入していないかを確認する。UI以外のHTTP入口からも認証・認可・監査を通せることを確認する。[連携方針](integration.md)を参照。
