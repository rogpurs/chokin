# CHOKIN_APP

給料日ベース（例: 毎月25日）の家計・貯金管理アプリです。  
初回アクセス時にセットアップウィザードを実行し、SQLite で構築します。

## 技術スタック

- Server: Node.js + Express + TypeScript
- DB: SQLite3（MySQLは削除済み）
- Client: React + Vite + Tailwind CSS
- PWA: vite-plugin-pwa
- Web Push: web-push
- LINE連携: LINE Messaging API（User ID + Channel Access Token 前提）

## セキュリティ強化内容

- `helmet` によるセキュリティヘッダ付与
- `express-rate-limit` による全APIおよび認証APIレート制限
- JWT 検証で `issuer` / `audience` を厳格化
- パスワード最小文字数強化（10文字以上）
- 入力値バリデーション強化（メール形式・給料日範囲など）
- `x-powered-by` 無効化
- JSON body サイズ制限（100KB）
- CORS を許可 origin 固定化（`CORS_ORIGIN` で変更）

## API 一覧

- `GET /api/setup/status`
- `POST /api/setup`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/accounts`
- `POST /api/accounts`
- `GET /api/goals`
- `POST /api/goals`
- `POST /api/goals/:id/savings`
- `POST /api/transactions`
- `POST /api/periods/close`
- `GET /api/reports`
- `GET /api/push/public-key`
- `POST /api/push/subscribe`
- `POST /api/push/test`
- `POST /api/line/link`
- `POST /api/line/test`

## MacBook 開発手順

```bash
cd server && npm install
cd ../client && npm install
```

```bash
# terminal 1
cd server
npm run dev
```

```bash
# terminal 2
cd client
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

## ビルド

```bash
cd client && npm run build
cd ../server && npm run build
```

## Raspberry Pi 本番運用

### 必要バージョン

- Node.js 20.x 以上
- npm 10.x 以上

### セットアップ

```bash
git pull
cd server && npm install && npm run build
cd ../client && npm install && npm run build
```

### 起動

```bash
cd /path/to/CHOKIN_APP/server
npm start
```

### SQLite 保存場所

- `server/data/app.sqlite3`
- `server/data/setup.json`

### systemd 例

```ini
[Unit]
Description=Chokin App Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/pi/CHOKIN_APP/server
ExecStart=/usr/bin/npm start
Restart=always
User=pi
Environment=NODE_ENV=production
Environment=CORS_ORIGIN=https://your-domain.example

[Install]
WantedBy=multi-user.target
```
