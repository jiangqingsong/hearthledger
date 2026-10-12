# HearthLedger 部署指南

本文是唯一的部署文档，覆盖两种方式：

- **方式一（推荐）**：GitHub 私有仓库 + GitHub Actions「push 即部署」——本机 `git push` 后自动同步代码并重建，全程不用 SSH 到服务器手动操作。
- **方式二（备选）**：手动 rsync 上传 + `docker compose` 构建——不依赖 GitHub，适合不想建仓库的情况。

两种方式最终都跑同一套 Docker Compose 编排（Nginx 反代 `/api` + 托管前端，FastAPI 后端，SQLite 数据持久化到命名卷）。

> ⚠️ 安全提示：当前是「只有公网 IP + HTTP」，登录密码在网络上明文传输。务必设置强密码，并尽快补域名 + HTTPS（见文末「下一步」）。

---

## 0. 通用前置（两种方式都要做）

### 确认系统（可选）

```bash
cat /etc/os-release
```

`Ubuntu` / `Debian` / `Alibaba Cloud Linux` / `CentOS` 均可。

### 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
docker --version && docker compose version
```

两个版本号都有输出即装好。

### 配置 Docker 镜像加速（国内必需）

国内直接拉 Docker Hub 会超时，先配阿里云加速：

1. 阿里云控制台 → 「容器镜像服务 ACR」→「镜像工具」→「镜像加速器」，复制专属地址（形如 `https://xxxxx.mirror.aliyuncs.com`）。
2. 服务器上：

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://xxxxx.mirror.aliyuncs.com"]
}
EOF
systemctl restart docker
```

### 开放安全组端口（关键，最常漏）

阿里云控制台 → ECS → 实例 → 安全组 → 入方向规则，添加：协议 `TCP`、端口 `8080/8080`、授权对象 `0.0.0.0/0`（或限定你家 IP 更安全）。否则即使服务跑起来也访问不到。

---

## 方式一：GitHub push 即部署（推荐）

架构：

```
Mac 上 git push → GitHub 私有仓库 → GitHub Actions（rsync 代码 + docker compose 重建）
                                          │  SSH（一把专用密钥）
                                          ▼
                                    阿里云服务器 /opt/hearthledger
```

秘密（登录密码、数据库）只留在服务器：`.env`、`*.db`、`backups/` 均已 gitignore，不进 GitHub。仓库里只有代码，但**务必用私有仓库**。

### 1. 创建私有仓库并推送

```bash
cd /Users/mac/personal/ai_project/hearthledger
git remote add origin git@github.com:你的用户名/hearthledger.git
git push -u origin main
```

（国内 HTTPS 访问 github.com 可能被墙，用 SSH 地址最稳。）

### 2. 生成部署密钥（Mac 上）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hearthledger_deploy -N "" -C "hearthledger-deploy"
```

生成 `~/.ssh/hearthledger_deploy`（私钥 → GitHub Secret）和 `.pub`（公钥 → 服务器）。

### 3. 服务器：放公钥 + 建目录 + 设密码

```bash
mkdir -p /root/.ssh
echo "ssh-ed25519 AAAA...粘贴公钥..." >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys

mkdir -p /opt/hearthledger
cat > /opt/hearthledger/.env <<'EOF'
HEARTHLEDGER_USERNAME=admin
HEARTHLEDGER_PASSWORD=改成你的强密码
EOF
```

服务器上**不需要装 git**，代码由 Actions 用 rsync 推过来。

### 4. GitHub 加 3 个 Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret：

| 名称 | 值 |
|---|---|
| `SSH_HOST` | 服务器公网 IP（`curl ifconfig.me` 查，纯 IP 不加 http://） |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | 私钥全文 `cat ~/.ssh/hearthledger_deploy`（含首尾 `-----` 行，多行整体粘贴） |

### 5. 触发首次部署

仓库 → Actions → 左侧 `Deploy to server` → `Run workflow`。首次要拉镜像 + 构建，约 1~3 分钟。

### 6. 日常更新

以后改完代码，本机：

```bash
git add -A && git commit -m "说明" && git push
```

推送后 Actions 自动部署，一两分钟后刷新线上即可。可在 Actions 页看日志。

---

## 方式二：手动 rsync（备选，不依赖 GitHub）

### 1. 上传代码（Mac 上）

```bash
cd /Users/mac/personal/ai_project/hearthledger
rsync -avz \
  --exclude 'frontend/node_modules' --exclude 'frontend/dist' \
  --exclude 'backend/.venv' --exclude '*.db' --exclude 'backend/backups' \
  --exclude '.git' --exclude '.env' \
  ./ root@服务器公网IP:/opt/hearthledger/
```

### 2. 配置密码（服务器上）

```bash
cd /opt/hearthledger
cat > .env <<'EOF'
HEARTHLEDGER_USERNAME=admin
HEARTHLEDGER_PASSWORD=改成你的强密码
EOF
```

### 3. 启动（服务器上）

```bash
cd /opt/hearthledger && docker compose up -d --build
```

### 4. 日常更新

重复第 1 步 rsync，再在服务器上 `docker compose up -d --build` 即可（数据库自动跑新增迁移，数据不丢）。

---

## 首次访问验证

浏览器打开 `http://服务器公网IP:8080/`，应看到登录页，用 `.env` 里设的账号密码登录。健康检查：

```bash
curl http://127.0.0.1:8080/api/health   # 应返回 {"ok":true}
```

---

## 日常运维

```bash
docker compose logs -f backend     # 后端日志
docker compose logs -f frontend    # Nginx 日志
docker compose down                # 停止（数据保留在卷里）
docker compose up -d               # 再次启动
docker compose restart             # 重启
```

## 数据与备份

数据在 Docker 命名卷里（`hearthledger_data` 存数据库、`hearthledger_backups` 存应用内「导出备份」生成的文件），重建容器不丢。手动取回：

```bash
cd /opt/hearthledger
# 备份数据库文件
docker run --rm -v hearthledger_data:/data -v "$PWD":/out alpine cp /data/hearthledger.db /out/hearthledger.db
# 打包应用内备份目录
docker run --rm -v hearthledger_backups:/backups -v "$PWD":/out alpine tar czf /out/hearthledger-backups.tgz -C /backups .
# 再把两个文件 scp 回本机保存
```

## 排错

| 现象 | 处理 |
|---|---|
| 浏览器打不开 / 一直转圈 | 检查安全组是否放行 8080；`docker compose ps` 是否两容器都在跑 |
| 构建拉镜像超时（`i/o timeout`） | 未配镜像加速，回「通用前置」第 3 步 |
| `8080 端口被占用` | `docker-compose.yml` 里 `"8080:80"` 改其他端口（如 `"9090:80"`），安全组放行对应端口，访问 `http://IP:9090/` |
| Actions 报 `Permission denied (publickey)` | 公钥没放对 / `SSH_HOST` 填错 / `SSH_PRIVATE_KEY` 漏了首尾行 |
| Actions 报 `HEARTHLEDGER_PASSWORD is required` | 服务器 `.env` 没建或密码为空 |
| 登录提示「用户名或密码错误」 | 账号只在首次创建，改 `.env` 不覆盖旧密码；想换密码在应用内用「修改密码」 |

---

## 下一步（强烈建议）

1. **加域名 + HTTPS**：域名解析到服务器 IP，用 Let's Encrypt 或阿里云免费证书给 Nginx 上 HTTPS，登录密码不再明文传输。
2. **收紧安全组**：8080 端口授权对象从 `0.0.0.0/0` 改成你家固定 IP。
3. **专用部署用户**：用受限用户（能跑 docker + 写 `/opt/hearthledger`）替代 `root` 跑部署，降低风险。
