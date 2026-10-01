# Audit Log

生成アプリの[監査仕様](../templates/default/docs/audit-log.md)と[設計判断0013](decisions/0013-audit-log.md)を参照。

共通処理は[@kumuno/audit-log](../packages/audit-log/README.md)へ抽出済み。業務固有の属性投影とPrisma接続はアプリが所有する。[設計判断](decisions/0031-audit-log-package.md)を参照。
