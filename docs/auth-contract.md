# HearthLedger 认证契约 (v1)

在既有 `/api` 契约（`docs/api-contract.md`）之上新增认证。核心原则：**数据库永不保存明文密码**。

## 认证机制

- **会话 Cookie**：登录成功后设置 `httpOnly` Cookie（名称 `hearthledger_session`），值为随机不透明 token（`secrets.token_urlsafe(32)`）。
- 服务端只保存 token 的 **SHA-256 哈希**（stdlib `hashlib`），不保存原始 token。DB 泄露不泄露会话。
- Cookie 属性：`httponly=True, samesite="lax"`；`secure` 由环境变量 `HEARTHLEDGER_COOKIE_SECURE`（默认 `false`，因为本地是 http；部署 https 时置 `true`）。
- 会话有效期 **30 天**（`expires_at`），过期即失效。
- 不使用 JWT，不把 token/密码放到前端 localStorage/sessionStorage。

## 数据模型（Alembic 迁移 0002）

### User
`id, username(unique, indexed), password_hash, created_at`

### Session
`id, token_hash(unique, indexed), user_id(FK), created_at, expires_at`

## 密码哈希

- 依赖：`bcrypt`（直接 `import bcrypt`，**不要**用 passlib——passlib 与 bcrypt 4.x 有版本兼容问题）。
- `bcrypt.hashpw(password.encode(), bcrypt.gensalt())`；校验用 `bcrypt.checkpw`。
- 任何地方都不保存、不打印明文密码。

## 账号初始化（种子，幂等）

- 从环境变量读取：`HEARTHLEDGER_USERNAME`（默认 `"admin"`）、`HEARTHLEDGER_PASSWORD`（默认 `"hearthledger"`）。
- 启动时（lifespan / seed）：若该 username 不存在则创建（密码哈希后入库）；**已存在则跳过，绝不覆盖密码**（改密码走 change-password）。
- 打印一行提示当前 username（不打印密码）。

## 端点

### `POST /api/auth/login`
body `{username, password}` → 成功：设置会话 Cookie，返回 `{username}`（200）；失败：`401 {"detail":"用户名或密码错误"}`。

### `POST /api/auth/logout`
清除当前会话（删 session 记录 + 清 Cookie），返回 `{ok:true}`。未登录也可调用（幂等）。

### `GET /api/auth/me`
返回 `{username}`（200）；未登录 401。

### `POST /api/auth/change-password`
body `{current_password, new_password}` → 校验 current，哈希后更新，作废旧会话（可选），返回 `{ok:true}`；current 错误 401。需登录。

### `GET /api/health`
公开（不要求登录），返回 `{ok:true}`，供部署探活。

## 保护规则

- 除 `POST /api/auth/login` 与 `GET /api/health` 外，**所有 `/api/*` 均要求登录**，未登录/会话失效统一返回 `401 {"detail":"未登录或会话已过期"}`。
- `/docs`、`/openapi.json` 在开发环境保留可访问；生产可用环境变量关闭（可选）。
- CORS：`allow_origins=["http://localhost:5173"]`，`allow_credentials=True`（Cookie 需要）。若走同源反代（Nginx）则无 CORS 问题。

## 后端测试要求（pytest 全绿，且不破坏现有 18 个测试）

- 现有测试全部改为**先登录拿会话**再访问受保护路由（更新 `conftest.py` 提供已认证 TestClient fixture）。
- 新增：登录成功 / 密码错误 401 / 未登录访问受保护路由 401 / login→me→logout 全流程 / 密码哈希断言（`password_hash != 明文`，且 `bcrypt.checkpw` 通过）/ change-password 成功后旧密码失效。
- 断言：数据库里查不到明文密码（`password_hash` 不以明文出现，且能以 bcrypt 校验）。

## 前端要求

- 新增登录页：username + password，提交 `POST /api/auth/login`，错误提示。
- 全局 auth 状态（context）：应用启动先 `GET /api/auth/me`；未登录显示登录页；已登录进入主应用。
- 所有 `fetch` 带 `credentials: "include"`（让 Cookie 自动携带）。
- 任何请求收到 401 → 清空 auth 状态 → 跳登录页。
- Header 显示当前登录 username + 「退出登录」按钮（`POST /api/auth/logout` 后跳登录页）。
- 前端不存密码/token 于本地存储。
- 首次使用提示：登录账号 `admin` / `hearthledger`（仅本地开发默认，部署前改）。

## 约束（沿用既有分工）

- 后端只动 `backend/`，前端只动 `frontend/`；都读本文件 + `docs/api-contract.md`。
- 不建 git 仓库、不提交（由主会话统一提交）。
- 后端用 `backend/.venv/bin/pip install bcrypt` 装依赖；验证 `backend/.venv/bin/pytest` 全绿。
- 前端验证 `npm run build`（tsc + vite）无错误。
