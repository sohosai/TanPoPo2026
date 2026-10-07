# TanPoPo2026

![TanPoPo 筑波大学雙峰祭 企画検索システム あなたの飛ばした一つの綿毛がすてきな企画へと導きます。](/docs/TanPoPo.jpg)

TanPoPo は、2026年度 筑波大学 雙峰祭向けの企画検索システムです。現在は以下の機能を中心に開発しています。

- 地図ベースの検索/案内機能
- 文字/フィルターベースの検索

## 技術構成

- Monorepo: Turborepo
- Package Manager: Bun
- Frontend: React Router（SPA）+ Vite
- Backend: Hono + tRPC（Cloudflare Workers）
- DB: Cloudflare D1 + Drizzle ORM
- 型共有: API の AppRouter 型を Web から参照

本番では 1 つの Worker が Web の静的ファイルと API（`/trpc/*`, `/auth/*`）を同一オリジンで配信する。詳細は [docs/api/deployment.md](docs/api/deployment.md) を参照。

## はじめに

セットアップ:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
bun install
bun run db:migrate
```

サーバー起動:

```bash
bun run dev
```

`http://localhost:5173` を開く。Vite が `/trpc` と `/auth` を `wrangler dev`（`http://localhost:8787`）へ転送する。

## コマンド

| 用途 | コマンド |
| --- | --- |
| 開発 | `bun run dev` |
| ローカルDBへのマイグレーション適用 | `bun run db:migrate` |
| ローカルDBのリセット | `bun run db:reset` |
| 型チェック | `bun run check` |
| フォーマット | `bun run format` |
| CI チェック | `bun run ci` |
| ビルド + デプロイ | `bun run deploy` |
| 生成物などのクリーン | `bun run clean` |

## ディレクトリ概要

```text
apps/
	web/      # React Router + Vite
	api/      # Hono + tRPC（Cloudflare Worker。wrangler.jsonc もここ）
packages/
	typescript-config/  # 共有TS設定
```
