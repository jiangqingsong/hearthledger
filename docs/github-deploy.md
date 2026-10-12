# 用 GitHub 做「push 即部署」

代码放进个人 GitHub 私有仓库，本机 `git push` 后，GitHub Actions 自动把代码同步到服务器并重建容器。全程无需 SSH 到服务器手动操作。

> 秘密（登录密码、数据库）**只留在服务器上**：`.env`、`*.db`、`backups/` 都已 gitignore，不进 GitHub。仓库里只有代码，所以私有仓库即可，但**务必用私有仓库**。

## 架构

```
Mac 上 git push → GitHub 私有仓库 → GitHub Actions (rsync 代码 + docker compose 重建)
                                          │  SSH（一把专用密钥）
                                          ▼
                                    阿里云服务器 /opt/hearthledger
```

只需要**一把 SSH 密钥**（GitHub → 服务器）。服务器上不需要装 git、不需要克隆仓库。

## 一次性配置

### 1. 创建私有仓库并推送

```bash
cd /Users/mac/personal/ai_project/hearthledger
git remote add origin git@github.com:你的用户名/hearthledger.git   # 或用 https 地址
git push -u origin main
```

（仓库名可自取，下面以 `hearthledger` 为例。）

### 2. 生成部署密钥（在你的 Mac 上）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hearthledger_deploy -N "" -C "hearthledger-deploy"
```

生成两个文件：`~/.ssh/hearthledger_deploy`（私钥，**进 GitHub 密文**）和 `~/.ssh/hearthledger_deploy.pub`（公钥，**进服务器**）。

### 3. 服务器：放公钥 + 建目录 + 设密码

SSH 到服务器后：

```bash
mkdir -p /root/.ssh
echo "粘贴公钥内容" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

mkdir -p /opt/hearthledger
cd /opt/hearthledger
cp /dev/null .env   # 先建空文件，下面写入内容
```

用编辑器写入 `/opt/hearthledger/.env`：

```
HEARTHLEDGER_USERNAME=admin
HEARTHLEDGER_PASSWORD=改成你的强密码
```

（`.env` 在 rsync 时被排除，永远不会被 GitHub 覆盖或删除。）

### 4. GitHub 仓库：添加 3 个 Secrets

GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，加：

| 名称 | 值 |
|---|---|
| `SSH_HOST` | 服务器公网 IP |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | 私钥全文，即 `cat ~/.ssh/hearthledger_deploy` 的输出（含首尾 `-----...-----` 行） |

### 5. 首次部署

推一次代码（或到 Actions 页面手动 `Run workflow`）触发部署。完成后浏览器开 `http://服务器IP/` 验证。

> 服务器 Docker 已装好即可；不需要装 git/rsync（rsync 由 GitHub 的 runner 执行）。

## 日常使用

以后改了代码，本机：

```bash
git add -A && git commit -m "说明" && git push
```

推完 GitHub Actions 自动部署，一两分钟后刷新线上即可看到。可在仓库 **Actions** 页看部署日志、判断成败。

---

## 安全说明

- **仓库设为私有**（`git push` 前在 GitHub 网页确认）。
- 登录密码、数据库、备份都不在仓库里；`.env` 只在服务器本地。
- 部署密钥是专用的一把，泄露后可随时在服务器 `authorized_keys` 里删掉那一行、并在 GitHub 重建 secret。
- 若用 `root` 登录部署，风险更高：更稳妥的做法是建一个受限用户（能跑 docker + 写 /opt/hearthledger），把公钥放到它的 `authorized_keys`，`SSH_USER` 填该用户名。想更安全我可以帮你配。
