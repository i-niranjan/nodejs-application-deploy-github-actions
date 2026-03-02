# 🚀 Universal Dockerized Production Deployment Playbook

This document defines a repeatable, secure process for deploying any Node.js / Fullstack / Docker-based application to a VPS using:

- Docker + Docker Compose
- GitHub Actions (CI/CD)
- SSH-based deploy
- Nginx (reverse proxy)
- Environment isolation
- No secrets in GitHub
- No secrets in repo

---

## 🧱 PHASE 1 — VPS PREPARATION

### 1️⃣ Create Non-Root User

```bash
adduser deploy
usermod -aG sudo deploy
```

Login:

```bash
ssh deploy@your_server_ip
```

### 2️⃣ Secure SSH

Disable root login:

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```
PermitRootLogin no
PasswordAuthentication no
```

Restart:

```bash
sudo systemctl restart ssh
```

### 3️⃣ Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo usermod -aG docker deploy
```

Re-login:

```bash
exit
ssh deploy@your_server_ip
```

Verify:

```bash
docker --version
docker compose version
```

---

## 🔐 PHASE 2 — SSH KEY STRATEGY

There are **TWO** different SSH use cases:

- **A)** GitHub → VPS (for deploy)
- **B)** VPS → GitHub (to pull repo)

Keep them separate.

### 1️⃣ Key for GitHub Actions → VPS

Generate locally:

```bash
ssh-keygen -t ed25519 -C "deploy-key"
```

Add public key to VPS:

```bash
nano ~/.ssh/authorized_keys
```

Paste public key.

Add private key to:

> GitHub → Repo → Settings → Secrets → Actions

Save as:

```
VPS_SSH_KEY
VPS_HOST
```

### 2️⃣ VPS Pulling From Private Repo

On VPS:

```bash
ssh-keygen -t ed25519 -C "vps-github"
```

Copy public key, then go to:

> GitHub → Repo → Settings → Deploy Keys

Add:
- **Title:** VPS Deploy Key
- **Allow write access:** ❌ (read-only)

Now VPS can:

```bash
git clone git@github.com:user/repo.git
```

---

## 📁 PHASE 3 — PROJECT STRUCTURE STANDARD

Always structure production apps like this:

```
/home/deploy/app-name
  docker-compose.yml
  Dockerfile
  .env.production
  (source code)
```

**Never commit** `.env.production` — add to `.gitignore`.

---

## 🐳 PHASE 4 — DOCKERIZATION RULES

### 1️⃣ Dockerfile Best Practices

- Multi-stage builds
- No secrets at build time
- No database connection during build
- Runtime env only via compose

**Never do:**

```dockerfile
RUN prisma migrate deploy
```

during build.

### 2️⃣ docker-compose.yml Rules

- Use service names as hostnames
- Never use `localhost` inside containers
- Use `--env-file` explicitly

Example pattern:

```yaml
services:
  app:
    build: .
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
```

Run with:

```bash
docker compose --env-file .env.production up -d --build
```

---

## 🔐 PHASE 5 — ENVIRONMENT STRATEGY

Keep environments separated:

```
.env.local
.env.staging
.env.production
```

Production file exists **ONLY on VPS**.

**Never:**
- Commit it
- Store it in GitHub secrets unless required
- Hardcode in compose

---

## 🤖 PHASE 6 — GITHUB ACTIONS STRATEGY

CI should:

- Install deps
- Lint
- Typecheck
- Build
- Cancel old runs
- Deploy only from `main`

**Never:**
- Store production secrets
- Build Docker image (if VPS builds)
- Run production migrations

Deployment pattern:

```
Push → CI passes → SSH → git pull → docker compose up --build
```

---

## 🌍 PHASE 7 — NGINX REVERSE PROXY

Install:

```bash
sudo apt install nginx -y
```

Create site:

```bash
sudo nano /etc/nginx/sites-available/app
```

Example:

```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 PHASE 8 — HTTPS (Let's Encrypt)

Install:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Run:

```bash
sudo certbot --nginx -d yourdomain.com
```

Auto-renew works automatically.

---

## 🧹 PHASE 9 — DEPLOYMENT FLOW

Final lifecycle:

```
Developer pushes →
  GitHub CI runs →
    If success →
      SSH to VPS →
        git reset →
        docker compose up -d --build →
        containers restart →
        nginx routes traffic →
        app live
```

---

## 🧠 PHASE 10 — PRODUCTION PRINCIPLES

**Always:**

- Separate build from runtime
- Separate secrets from repo
- Separate deploy keys from user keys
- Use non-root users
- Use service names for internal networking
- Keep infra reproducible

---

## 🎯 OPTIONAL ADVANCED ADDITIONS

Later you can add:

- Healthcheck validation after deploy
- Rollback strategy
- Staging server
- Docker registry
- CI Docker image build
- Monitoring (Prometheus/Grafana)
- Log rotation
- Firewall (ufw)
