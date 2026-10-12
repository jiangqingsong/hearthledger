# HearthLedger 部署指南（阿里云 + Docker Compose + 公网 IP + HTTP）

本方案用 **Docker Compose** 把前端（Nginx 静态站 + 反向代理）和后端（FastAPI）打包成两个容器，一条命令启动。前端和后端同源，无需处理 CORS。

> ⚠️ 当前是「只有公网 IP + HTTP」：登录密码会在网络上**明文传输**，有被窃听的风险。请务必设置**强密码**，并尽快补域名 + HTTPS（见文末「下一步」）。

---

## 第 0 步：确认服务器系统（可选）

SSH 登录服务器后执行：

```bash
cat /etc/os-release
```

看到 `Ubuntu` / `Debian` / `Alibaba Cloud Linux` / `CentOS` 都行，下面的 Docker 安装用一条通用脚本即可。

## 第 1 步：在服务器上安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
docker --version && docker compose version
```

`docker compose version` 有输出即表示 compose 插件也装好了。

## 第 2 步：把代码上传到服务器

在本机（你的 Mac）上，把项目同步到服务器 `/opt/hearthledger`（排除掉大文件和本地数据）：

```bash
rsync -avz \
  --exclude 'frontend/node_modules' --exclude 'frontend/dist' \
  --exclude 'backend/.venv' --exclude '*.db' --exclude 'backend/backups' \
  --exclude '.git' \
  ./ root@服务器公网IP:/opt/hearthledger/
```

（`root@服务器公网IP` 换成你的登录方式，例如 `ubuntu@1.2.3.4`。）

> 以后每次更新代码，重复这条 rsync 命令，再在服务器上 `docker compose up -d --build` 即可。

## 第 3 步：配置登录密码

在服务器上：

```bash
cd /opt/hearthledger
cp .env.example .env
nano .env      # 或 vim .env
```

把 `HEARTHLEDGER_PASSWORD` 改成一个**强密码**（≥12 位，含大小写字母 + 数字 + 符号）。`HEARTHLEDGER_USERNAME` 默认 `admin`，可改成你喜欢的账号。

> `.env` 已被 git 忽略，不会进版本库，也不会随 rsync 的 `.git` 排除影响（rsync 会同步它，这没问题——它只在服务器上用）。

## 第 4 步：启动服务

```bash
cd /opt/hearthledger
docker compose up -d --build
```

首次会自动：构建镜像 → 跑数据库迁移 → 创建你的登录账号 → 启动后端 + Nginx。看到两个容器都 `Started` 即成功：

```bash
docker compose ps          # 两个容器应为 Up/running
docker compose logs -f backend   # 看后端日志，Ctrl+C 退出
```

## 第 5 步：在阿里云控制台开放端口（关键！）

这是最常被漏掉的一步。**即使服务已跑起来，防火墙不放行也访问不到。**

1. 登录阿里云控制台 → 云服务器 ECS → 找到你的实例 → **安全组**。
2. 入方向规则 → 手动添加：协议 `TCP`，端口范围 `80/80`，授权对象 `0.0.0.0/0`（或限定你的家庭 IP 更安全）。
3. 保存。SSH 用的 22 端口一般已默认放行，别动它。

## 第 6 步：验证

浏览器打开 `http://服务器公网IP/`：

- 应看到 HearthLedger 登录页。
- 用第 3 步设的账号密码登录，进入主应用。
- 记一笔、看报表、资产页都应正常（数据会写进持久化卷，重启不丢）。

后端健康检查（可选）：

```bash
curl http://127.0.0.1/api/health   # 应返回 {"ok":true}
```

---

## 日常运维

### 查看日志

```bash
docker compose logs -f backend    # 后端
docker compose logs -f frontend   # Nginx
```

### 停止 / 重启

```bash
docker compose down        # 停止（数据保留在卷里）
docker compose up -d       # 再次启动
docker compose restart     # 重启
```

### 更新代码（以后我改了版本，你这样升级）

```bash
# 本机：重新 rsync 同步（同第 2 步命令）
# 服务器：
cd /opt/hearthledger && docker compose up -d --build
```

数据库会自动跑新增的迁移，数据不丢。

### 数据存在哪 / 怎么备份

数据在 Docker 命名卷里（`hearthledger_data` 存数据库，`hearthledger_backups` 存应用内「导出备份」生成的文件），重启/重建容器都不会丢。要手动备份：

```bash
cd /opt/hearthledger
# 备份数据库文件
docker run --rm -v hearthledger_data:/data -v "$PWD":/out alpine cp /data/hearthledger.db /out/hearthledger.db
# 打包应用内备份目录
docker run --rm -v hearthledger_backups:/backups -v "$PWD":/out alpine tar czf /out/hearthledger-backups.tgz -C /backups .
# 然后把这两个文件 scp 回本机保存
```

也可以在应用里点「导出备份」（会生成 SQLite 快照 + JSON，落在 `hearthledger_backups` 卷里），再用上面的命令取回。

---

## 排错

| 现象 | 处理 |
|---|---|
| 浏览器打不开 / 一直转圈 | 检查第 5 步安全组是否放行 80 端口；`docker compose ps` 是否两个容器都在跑 |
| `80 端口被占用` | 改 `docker-compose.yml` 里 `"80:80"` 为 `"8080:80"`，同时安全组放行 8080，访问 `http://IP:8080/` |
| 登录提示「用户名或密码错误」 | 改过 `.env` 后需重建账号：账号只在**首次**创建，之后改 `.env` 不会覆盖密码。想换密码可删卷重来，或在应用内用「修改密码」 |
| 启动报 `HEARTHLEDGER_PASSWORD is required` | 没建 `.env` 或没填密码，回第 3 步 |
| `docker: command not found` | 第 1 步没装成功，重新跑安装脚本 |

---

## 下一步（强烈建议）

1. **加域名 + HTTPS**：买/解析一个域名到服务器 IP，用 Let's Encrypt（certbot）或阿里云免费证书给 Nginx 上 HTTPS，登录密码就不再明文传输。到时我帮你把 compose 和 nginx 配好。
2. **限制安全组来源**：把 80 端口的授权对象从 `0.0.0.0/0` 改成你家的固定 IP，进一步收紧入口（前提是你家 IP 基本固定）。
