# LINEログイン

雙峰祭グランプリ投票・来場者アンケートの認証には「LINEログイン」(OAuth 2.0 Authorization Code Flow)を使う。LIFF(LINEアプリ内ブラウザ前提)ではなく、QRコードやブラウザから直接開かれても動作する標準的なリダイレクト方式。

Web と API は同一オリジンで配信される（本番は同じ Worker、ローカルは Vite のプロキシ経由）。

## フロー

1. Webから `GET /auth/line/login?redirect=/grandprix` へフルページ遷移する（`redirect`はログイン後に戻る相対パス、省略時は `/`）。
2. APIが CSRF対策の `state` と `nonce` を発行し、httpOnly cookie(`/auth/line`配下のみ有効、10分)に保存した上で、LINEの認可画面へ302リダイレクトする。
3. ユーザーがLINE側で認可すると `GET /auth/line/callback?code=...&state=...` に戻ってくる。
4. APIは `state` を検証し、認可コードをLINEのトークンエンドポイントでID Token(JWT)に交換、`jose` でID Tokenの署名・`iss`/`aud`/`nonce`を検証する。LINEのID TokenはHS256（チャネルシークレットを鍵とする対称鍵署名）で発行されるため、JWKS（公開鍵）ではなく`LINE_CHANNEL_SECRET`を鍵として検証する。
5. ID Tokenの `sub`(LINEユーザーの安定ID)で `users` テーブルをupsertし、セッション(`sessions`テーブル、cookieには生トークンのSHA-256ハッシュを保存)を発行、httpOnly cookieとしてセットする。cookie の `Secure` 属性は https で配信されているときだけ付く。
6. `redirect` へリダイレクトする。

ログアウトは `GET /auth/logout`。セッションを削除しcookieを消してリダイレクトする。

## 関連ファイル

- `apps/api/services/line-auth.ts` — LINEとのHTTPやりとり・ID Token検証
- `apps/api/auth/session.ts` — セッションの作成/検証/破棄
- `apps/api/auth/routes.ts` — `/auth/line/login` `/auth/line/callback` `/auth/logout` のHonoルート
- `apps/api/trpc/context.ts` / `apps/api/trpc/trpc.ts` — セッションをtRPCコンテキストに解決し、`protectedProcedure` でログイン必須のプロシージャを作る
- `apps/api/trpc/routers/auth.ts` — `auth.me`(ログイン状態確認。未ログイン時は `null`）

## Web側の利用方法

- ログイン状態の確認は `trpc.auth.me.useQuery()`。ログイン済みならユーザー情報（`id` と `displayName`）、未ログインなら `null` を返す（エラーにはならない）。
- 未ログイン時は `getLineLoginUrl('/grandprix')`（`apps/web/app/lib/auth.ts`）へのリンク遷移でログインを開始する（`fetch`ではなくブラウザの実遷移が必要）。

## 事前準備（クライアント側の作業）

[LINE Developers Console](https://developers.line.biz/console/)で「LINEログイン」チャネルを作成し、以下を取得・登録する。

- Channel ID → `LINE_CHANNEL_ID`
- Channel Secret → `LINE_CHANNEL_SECRET`（非公開）
- コールバックURLをConsole側に登録 → `LINE_CALLBACK_URL` と同じ値
  - 開発: `http://localhost:5173/auth/line/callback`
  - 本番: `https://<本番のドメイン>/auth/line/callback`

ローカルでは `apps/api/.env`（`.gitignore`済み）に設定する。詳細は [environment-variables.md](./environment-variables.md)。
