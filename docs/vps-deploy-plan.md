# План развёртывания Vibes LMS на VPS (hostkey.ru)

## Контекст

Сейчас проект размещён на Vercel (бесплатно) + TimeWeb managed DB (~600 руб/мес). Цель — перенести всё (приложение + база данных) на один VPS на hostkey.ru, чтобы сэкономить и получить полный контроль. Vercel-деплой остаётся работающим как резерв.

---

## Выбор тарифа

### Рекомендация: nano

| Параметр | Значение |
|----------|----------|
| CPU | 2 vCPU |
| RAM | 2 GB |
| Диск | 60 GB SSD |
| Трафик | 1 Gbit/s, 3 TB |
| Geekbench | 1270 |
| Цена | **420 руб/мес** (оплата за год) |

### Доступные тарифы (Россия, оплата за год)

| Тариф | vCPU | RAM | Диск | Geekbench | Цена | Вердикт |
|-------|------|-----|------|-----------|------|---------|
| pico | 1 | 1 GB | 40 GB SSD | 489 | 340 руб/мес | Рискованно — 1 GB впритык |
| **nano** | **2** | **2 GB** | **60 GB SSD** | **1270** | **420 руб/мес** | **Оптимально** |
| mini | 4 | 6 GB | 120 GB SSD | 1858 | 690 руб/мес | Избыточно для 10-50 юзеров |

### Почему nano, а не pico

**pico (1 GB RAM) — рискованно:**
- После ОС (~300 MB) остаётся ~700 MB на всё
- Node.js (~200 MB) + PostgreSQL (~200 MB) + Nginx + PM2 = ~500 MB базово
- При 10+ одновременных SSE-соединениях (AI чат) память может закончиться
- 1 vCPU — медленный `npm run build` при деплое
- Geekbench 489 — в 2.5 раза слабее nano

**nano (2 GB RAM) — оптимально:**
- ~1.5 GB свободно после старта всех сервисов
- 2 vCPU — сборка и запросы обрабатываются параллельно
- 60 GB SSD — проект использует ~8-10 GB, хватит надолго
- Geekbench 1270 — достаточная производительность

**mini (6 GB RAM) — избыточно:**
- Для 10-50 пользователей overkill
- Дороже текущей схемы (690 vs 600 руб)
- Имеет смысл при росте до 100+ онлайн

### Потребление ресурсов проекта

- Node.js процесс: ~150-250 MB RAM
- PostgreSQL: ~100-200 MB RAM
- Nginx: ~10-20 MB
- PM2: ~30-50 MB
- **Итого базово:** ~300-500 MB, с запасом на пики — 2 GB достаточно

Дисковое пространство:
- Ubuntu система: ~5-7 GB
- Node.js + node_modules: ~600 MB
- PostgreSQL данные: ~50-100 MB
- Статика (dist/): 3.4 MB
- Логи + бэкапы: ~500 MB-1 GB
- **Итого:** 60 GB более чем хватает

### Сравнение расходов

| Схема | Стоимость |
|-------|-----------|
| **Текущая:** Vercel + TimeWeb DB | 600 руб/мес |
| **VPS nano (за год):** hostkey.ru | 420 руб/мес |
| **Экономия** | **180 руб/мес** |

### Масштабирование

| Нагрузка | Тариф | Цена |
|----------|-------|------|
| До 50 онлайн | nano (2 vCPU, 2 GB) | 420 руб/мес |
| 50-150 онлайн | mini (4 vCPU, 6 GB) | 690 руб/мес |
| 150+ онлайн | medium или выделенный сервер | от 1000 руб/мес |

---

## Часть 1: Изменения в коде (5 файлов)

Все изменения обратно совместимы — Vercel-деплой продолжит работать.

### 1.1 Создать `server.ts` — production Express-сервер

На основе существующего `dev-server.js` (функция `loadApiRoute`), но для production:
- Раздаёт статику `dist/` с кешированием (assets → immutable 1y, html → no-cache)
- Маршрутизирует `/api/*` через ту же `loadApiRoute` что и dev-server
- SPA fallback: все остальные пути → `dist/index.html`
- `GET /health` — healthcheck
- Graceful shutdown по SIGTERM
- Раздаёт `uploads/` для локально загруженных файлов
- Слушает `process.env.PORT || 3000`
- НЕ использует cors (один домен), НЕ загружает .env.local (production)
- `express.json({ limit: '15mb' })` — для base64 загрузок (upload.ts)

### 1.2 Изменить `api/_lib/db.ts`

Сделать pool конфигурируемым через env-переменные:

```diff
 const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
-  ssl: process.env.NODE_ENV === 'production'
-    ? { rejectUnauthorized: false }
-    : false,
-  max: 1,
-  min: 0,
-  idleTimeoutMillis: 10000,
-  connectionTimeoutMillis: 5000,
-  allowExitOnIdle: true,
+  ssl: process.env.DB_SSL === 'true'
+    ? { rejectUnauthorized: false }
+    : false,
+  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 1,
+  min: 0,
+  idleTimeoutMillis: 10000,
+  connectionTimeoutMillis: 5000,
+  allowExitOnIdle: !process.env.DB_POOL_MAX,
 });
```

Логика:
- **Vercel + TimeWeb DB:** `DB_SSL=true`, `DB_POOL_MAX` не задан → ssl on, max 1, allowExitOnIdle true (как сейчас)
- **VPS (БД на localhost):** env не заданы → ssl off, max 1, allowExitOnIdle true
- **VPS (оптимально):** `DB_POOL_MAX=10` → max 10, allowExitOnIdle false

### 1.3 Создать `api/_lib/storage.ts` — адаптер хранилища

Универсальный адаптер с тремя провайдерами:
1. **Локальное хранилище** (по умолчанию на VPS) — сохраняет в `uploads/`, раздаёт через Express
2. **S3** — если заданы `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
3. **Vercel Blob** — если задан `BLOB_READ_WRITE_TOKEN` (текущее поведение)

```typescript
export async function uploadFile(
  buffer: Buffer, filename: string, mimeType: string
): Promise<{ url: string }>
```

### 1.4 Изменить `api/upload.ts`

```diff
-import { put } from '@vercel/blob';
+import { uploadFile } from './_lib/storage.js';

-    const blob = await put(uniqueFilename, buffer, {
-      access: 'public',
-      contentType: mimeType,
-    });
+    const result = await uploadFile(buffer, uniqueFilename, mimeType);

     return res.status(200).json(successResponse({
-      url: blob.url,
+      url: result.url,
       size: buffer.length,
     }));
```

### 1.5 Изменить `package.json`

```diff
 "scripts": {
+  "start": "NODE_ENV=production tsx server.ts",
   "dev": "concurrently \"npm run dev:api\" \"npm run dev:vite\"",
 },
 "dependencies": {
+  "express": "^5.2.1",       // перенести из devDependencies
+  "cors": "^2.8.5",          // перенести из devDependencies (нужен dev-server)
 },
 "devDependencies": {
-  "express": "^5.2.1",
-  "cors": "^2.8.5",
 },
+"engines": {
+  "node": ">=20"
+}
```

### Список файлов

| Файл | Действие | Описание |
|------|----------|----------|
| `server.ts` | Создать | Production Express-сервер |
| `api/_lib/storage.ts` | Создать | Адаптер хранилища (local/S3/Blob) |
| `api/_lib/db.ts` | Изменить | Конфигурируемый pool + SSL |
| `api/upload.ts` | Изменить | Использовать storage адаптер |
| `package.json` | Изменить | Скрипт start, перенос зависимостей |

**Не трогаем:** фронтенд-код, vercel.json, fetchWithAuth.ts, App.tsx, все views/components.

---

## Часть 2: Настройка VPS

### 2.1 Первоначальная настройка

```bash
# Подключение к серверу (root пароль приходит на email после заказа)
ssh root@<IP_АДРЕС>

# Создание пользователя
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Дальше работаем как deploy
su - deploy

# Обновление системы
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw fail2ban

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2.2 Установка Node.js 20

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20
```

### 2.3 Установка PostgreSQL 15

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-15 postgresql-contrib-15
```

Создание БД и пользователя:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE vibes_lms;
CREATE USER vibes_user WITH PASSWORD 'сильный_пароль';
GRANT ALL PRIVILEGES ON DATABASE vibes_lms TO vibes_user;
\c vibes_lms
GRANT ALL ON SCHEMA public TO vibes_user;
\q
```

Оптимизация для 2GB RAM (в `/etc/postgresql/15/main/postgresql.conf`):

```
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
work_mem = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 2.4 Миграция данных с TimeWeb

```bash
# На локальной машине — экспорт с TimeWeb
pg_dump -h <TIMEWEB_HOST> -U <TIMEWEB_USER> -d <TIMEWEB_DB> \
  --no-owner --no-acl --clean --if-exists \
  -f vibes_backup.sql

# Загрузка на VPS
scp vibes_backup.sql deploy@<IP_АДРЕС>:~/

# На VPS — импорт
PGPASSWORD='пароль' psql -h localhost -U vibes_user -d vibes_lms -f ~/vibes_backup.sql
```

Если БД пустая (новая установка):

```bash
cd ~/vibes-app
PGPASSWORD='пароль' psql -h localhost -U vibes_user -d vibes_lms -f database/schema.sql
PGPASSWORD='пароль' psql -h localhost -U vibes_user -d vibes_lms -f database/seed.sql
# + все миграции из database/migrations/
```

### 2.5 Автобэкапы PostgreSQL

```bash
mkdir -p ~/backups

cat > ~/backup-postgres.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PGPASSWORD='пароль' pg_dump -h localhost -U vibes_user -d vibes_lms \
  --no-owner --no-acl > "$BACKUP_DIR/vibes_lms_$TIMESTAMP.sql"
find "$BACKUP_DIR" -name "vibes_lms_*.sql" -mtime +7 -delete
SCRIPT

chmod +x ~/backup-postgres.sh

# Добавить в cron (ежедневно в 3:00)
crontab -e
# 0 3 * * * /home/deploy/backup-postgres.sh >> /home/deploy/backups/backup.log 2>&1
```

### 2.6 Установка Nginx + PM2

```bash
sudo apt install -y nginx
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
# Выполнить команду которую выдаст PM2
```

### 2.7 Деплой приложения

```bash
cd ~
git clone https://github.com/ungurenko/Vibes_LMS_new.git vibes-app
cd vibes-app
git checkout dev

# Env-переменные
cat > .env.production << 'ENV'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://vibes_user:пароль@localhost:5432/vibes_lms
DB_POOL_MAX=10
JWT_SECRET=<секрет_минимум_32_символа>
OPENROUTER_API_KEY=<ключ>
UPLOAD_DIR=./uploads
ENV

chmod 600 .env.production

# Установка и сборка
npm ci --production=false
npm run build

# PM2 конфиг
cat > ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: 'vibes-lms',
    script: 'tsx',
    args: 'server.ts',
    cwd: '/home/deploy/vibes-app',
    env_file: '.env.production',
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
  }]
};
PM2

mkdir -p logs uploads
pm2 start ecosystem.config.js
pm2 save
```

### 2.8 Настройка Nginx

Файл `/etc/nginx/sites-available/vibes-lms`:

```nginx
upstream vibes_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name ваш_домен.ru www.ваш_домен.ru;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               font/truetype font/opentype image/svg+xml;

    location / {
        proxy_pass http://vibes_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE streaming (AI чат) — отключаем буферизацию
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vibes-lms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Часть 3: Домен и SSL

### Покупка домена

- `.ru` — ~200-300 руб/год (reg.ru, timeweb, r01)
- `.com` — ~1000-1500 руб/год
- Другие варианты: `.online`, `.school`, `.academy`

### Настройка DNS

В панели регистратора домена добавить A-записи:

```
Тип: A    Имя: @      Значение: <IP_VPS>
Тип: A    Имя: www     Значение: <IP_VPS>
```

### SSL сертификат (бесплатно, Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ваш_домен.ru -d www.ваш_домен.ru

# Проверка автообновления
sudo certbot renew --dry-run
```

Certbot автоматически настроит HTTPS и редирект HTTP → HTTPS.

### Без домена (по IP)

Если домена нет, заменить `server_name` на IP адрес VPS. SSL по IP через Let's Encrypt получить нельзя (только самоподписанный сертификат).

---

## Часть 4: Обновления и обслуживание

### Скрипт деплоя обновлений

```bash
cat > ~/deploy.sh << 'SCRIPT'
#!/bin/bash
set -e
echo "=== Deployment ==="
cd ~/vibes-app
pm2 stop vibes-lms
git pull origin dev
npm ci --production=false
npm run build
pm2 start vibes-lms
echo "=== Done ==="
SCRIPT

chmod +x ~/deploy.sh

# Использование:
~/deploy.sh
```

### Мониторинг

```bash
pm2 status                    # Статус приложения
pm2 logs vibes-lms            # Логи в реальном времени
pm2 monit                     # CPU/RAM в реальном времени
free -h                       # Использование памяти
df -h                         # Использование диска
```

### Безопасность

После настройки SSH ключей отключить парольный вход:

```bash
# В /etc/ssh/sshd_config:
PasswordAuthentication no
PermitRootLogin no

sudo systemctl restart sshd
```

---

## Верификация

1. `npm run build` — Vite сборка проходит
2. `npm start` — production-сервер запускается на :3000
3. `curl http://localhost:3000/health` — healthcheck OK
4. `curl http://localhost:3000/api/content/styles` — API работает
5. Открыть http://localhost:3000 — SPA загружается
6. `npm run dev` — dev-режим (Vercel) всё ещё работает
7. Загрузка файла — сохраняется в `uploads/` и доступен по URL
8. Логин → навигация → AI чат → проверить SSE streaming
9. Открыть через домен (после DNS) → HTTPS работает

---

## Env-переменные

### На VPS (.env.production)

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://vibes_user:пароль@localhost:5432/vibes_lms
DB_POOL_MAX=10
JWT_SECRET=<секрет>
OPENROUTER_API_KEY=<ключ>
UPLOAD_DIR=./uploads
```

### На Vercel (без изменений)

```
DATABASE_URL=<TimeWeb connection string>
DB_SSL=true
JWT_SECRET=<секрет>
OPENROUTER_API_KEY=<ключ>
BLOB_READ_WRITE_TOKEN=<токен>
```
