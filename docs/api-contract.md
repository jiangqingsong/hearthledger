# HearthLedger API 契约 (v1)

Base URL：`/api`，请求/响应均为 JSON。金额一律为整数元。

## 枚举

- `direction`: `"income"` | `"expense"`
- `owner`: `"me"` | `"spouse"` | `"shared"`
- `kind`: `"asset"` | `"liability"`
- `subtype`（asset）：`"deposit"` | `"cash"` | `"property"` | `"car"`
- `subtype`（liability）：`"mortgage"` | `"credit_card"` | `"car_loan"` | `"consumer_loan"`

## 数据模型

### Category
`id, name, direction, parent_id(null), sort_order, hint(null)`

### Transaction
`id, date("YYYY-MM-DD"), direction, amount(int), category_id, owner, note(null), created_at, updated_at`

### BalanceItem
`id, name, kind, subtype, owner, current_value(int), note(null), updated_at`

### Template
`id, name, direction, amount(int), category_id, owner, note(null), sort_order`

## 端点

### Transactions
- `GET /api/transactions?month=YYYY-MM&owner=&category_id=&direction=` → 列表（date desc, created_at desc）
- `POST /api/transactions` body `{date,direction,amount,category_id,owner,note}` → 创建
- `PUT /api/transactions/{id}` → 更新
- `DELETE /api/transactions/{id}` → 204
- `POST /api/transactions/copy-last-month` body `{from_month,to_month}` → `{copied:n}`（复制 from 月全部流水到 to 月，日不变、非法日截断）

### Categories
- `GET /api/categories`（按 sort_order 排序）
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`（有流水引用时返回 409）

### Balance
- `GET /api/balance-items`
- `POST /api/balance-items`、`PUT/DELETE /api/balance-items/{id}`
- `GET /api/balance/summary` → `{total_assets, total_liabilities, net_worth, liquid_assets}`（liquid = asset 且 subtype ∈ deposit/cash）

### Templates
- `GET /api/templates`、`POST /api/templates`、`PUT/DELETE /api/templates/{id}`

### Reports
- `GET /api/reports/monthly?months=12` → `[{month, income, expense, balance}]`（时间升序）
- `GET /api/reports/category-breakdown?month=YYYY-MM&direction=expense` → `[{category_id, name, amount}]`（amount desc）
- `GET /api/reports/member-breakdown?month=YYYY-MM&direction=expense` → `[{owner, amount}]`

### Backup
- `GET /api/backup` → `{ok:true, file:"..."}`（SQLite 一致性快照 + JSON 导出）

## 预置类别（种子数据）

- 支出：房贷/房租、日常吃喝(hint:买菜/外出吃)、孩子(hint:教育/兴趣班/用品)、交通/汽车、水电煤通讯、购物/网购/娱乐、保险(hint:商业/车险)、其他
- 收入：工资(hint:用归属区分)、补课、其他

## 预置模板（种子数据）

- 工资 +30000（income，工资，me）
- 房贷 -12000（expense，房贷，shared）
- 水电煤 -300（expense，水电煤，shared）
- 商业保险 -1800（expense，保险，shared）
