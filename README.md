# TanPoPo2026

![TanPoPo 筑波大学雙峰祭 企画検索システム あなたの飛ばした一つの綿毛がすてきな企画へと導きます。](/docs/TanPoPo.jpg)

TanPoPo は、2026年度 筑波大学 雙峰祭向けの企画検索システムです。現在は以下の機能を中心に開発しています。

- 地図ベースの検索/案内機能
- 文字/フィルターベースの検索

## 技術構成

- Monorepo: Turborepo
- Runtime / Package Manager: Bun
- Frontend: React Router + Vite
- Backend: Hono + tRPC
- 型共有: API の AppRouter 型を Web から参照

## はじめに

セットアップ:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
bun install
```

DB(MySQL)起動 + マイグレーション（初回・スキーマ変更時）:

```bash
bun run db:up
bun run --cwd apps/api db:migrate
```

詳細は [docs/api/database.md](docs/api/database.md) を参照。

サーバー起動:

```bash
bun run dev
```

## コマンド

| 用途 | コマンド |
| --- | --- |
| 開発 | `bun run dev` |
| DB(MySQL)起動 | `bun run db:up` |
| ローカルDBのリセット | `bun run db:reset` |
| 型チェック | `bun run check` |
| フォーマット | `bun run format` |
| CI チェック | `bun run ci` |
| 生成物などのクリーン | `bun run clean` |


## ディレクトリ概要

```text
apps/
	web/      # React Router + Vite
	api/      # Hono + tRPC
packages/
	typescript-config/  # 共有TS設定
```
