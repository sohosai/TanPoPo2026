# LINEログイン

雙峰祭グランプリ投票・来場者アンケートの認証には「LINEログイン」(OAuth 2.0 Authorization Code Flow)を使う。LIFF(LINEアプリ内ブラウザ前提)ではなく、QRコードやブラウザから直接開かれても動作する標準的なリダイレクト方式。

Web と API は同一オリジンで配信される（本番は同じ Worker、ローカルは Vite のプロキシ経由）。

## 機能の有効・無効

LINE ログインを使う機能（グランプリ投票・来場者アンケート）は、API の環境変数で機能ごとに受付を切り替える。どちらも `true` のときだけ有効になり、未設定やそれ以外の値なら無効になる。LINE ログイン自体は、どちらかが有効な間だけ受け付ける。Web はビルドに値を持たず、tRPC の `auth.enabled`（`{ grandprix, questionnaire }`）で API の状態を取得して表示を切り替える。そのため Worker の環境変数を変えるだけで、再ビルドせずに切り替わる。

| 環境変数 | 機能 | 無効のときの API | 無効のときの Web |
| --- | --- | --- | --- |
| `GRANDPRIX_ENABLED` | グランプリ投票 | `grandprix.*` は `NOT_FOUND` | `/grandprix` は「受付時間外です」の案内になる |
| `QUESTIONNAIRE_ENABLED` | 来場者アンケート | `questionnaire.*` は `NOT_FOUND` | `/questionnaire` は「受付時間外です」の案内になる |

- 両方とも無効なときは、`/auth/*` も 404 になり、tRPC の `auth.me` は `NOT_FOUND` を返す。セッションの Cookie も読まない。
- 企画一覧の先頭のグランプリ投票・来場者アンケートの導線は、受付時間外でも常に出す。入った先で時間外の案内を出す（404 のページと同じデザイン。`apps/web/app/components/layouts/StatusPage/StatusPage.tsx` の `OutOfHoursPage`）。
- 無効にした機能は、それまでの回答や結果も表示できない。来場者アンケートの福引券やグランプリの引換証を福引所で見せる時間帯は、その機能を有効にしておく。
- Web は `auth.enabled` を取得できないとき（オフラインなど）も無効として扱う。
- 無効にしてもデータベース（`users`・`sessions`・投票・アンケートのテーブル）と LINE のチャネル設定（`LINE_CHANNEL_*`）はそのまま残る。有効に戻せば、それまでのデータとログイン中のセッションを引き続き使える。
- 実装: API は `apps/api/index.ts`（`/auth/*` を塞ぐ）と `apps/api/trpc/trpc.ts` の `lineProcedure`（`auth.me`）・`featureProcedure`・`protectedProcedure`（機能ごと）。判定は `apps/api/domain/features.ts` の `isFeatureEnabled` と `isLineLoginEnabled`。Web は `apps/web/app/lib/auth.ts` の `fetchFeatureEnabled`（`/grandprix`・`/questionnaire` の `clientLoader`）で取得する。

## フロー

1. Webから `GET /auth/line/login?redirect=/grandprix` へフルページ遷移する（`redirect`はログイン後に戻る相対パス、省略時は `/`）。
2. APIが CSRF対策の `state` と `nonce` を発行する。`state`・`nonce`・`redirect` は `oauth_states` テーブル（10分で失効）に、`state` は httpOnly cookie(`/auth/line`配下のみ有効、10分)にも保存した上で、LINEの認可画面へ302リダイレクトする。
3. ユーザーがLINE側で認可すると `GET /auth/line/callback?code=...&state=...` に戻ってくる。
4. APIは `state` を `oauth_states` から取り出して消し（1回しか使えない）、有効期限と、cookie があればその値との一致を検証する。LINEアプリを経由する自動ログインでは、コールバックが開始時と別のブラウザ（iOS の Safari など）で開いて cookie が届かないことがあるため、cookie が無いときは `oauth_states` の記録だけで受け入れる。続けて認可コードをLINEのトークンエンドポイントでID Token(JWT)に交換、`jose` でID Tokenの署名・`iss`/`aud`/`nonce`を検証する。LINEのID TokenはHS256（チャネルシークレットを鍵とする対称鍵署名）で発行されるため、JWKS（公開鍵）ではなく`LINE_CHANNEL_SECRET`を鍵として検証する。
5. ID Tokenの `sub`(LINEユーザーの安定ID)で `users` テーブルをupsertし、セッション(`sessions`テーブル、cookieには生トークンのSHA-256ハッシュを保存)を発行、httpOnly cookieとしてセットする。cookie の `Secure` 属性は https で配信されているときだけ付く。
6. `redirect` へリダイレクトする。

ログアウトは `GET /auth/logout`。セッションを削除しcookieを消してリダイレクトする。

## 関連ファイル

- `apps/api/services/line-auth.ts` — LINEとのHTTPやりとり・ID Token検証
- `apps/api/auth/session.ts` — セッションの作成/検証/破棄
- `apps/api/auth/routes.ts` — `/auth/line/login` `/auth/line/callback` `/auth/logout` のHonoルート
- `apps/api/trpc/context.ts` / `apps/api/trpc/trpc.ts` — セッションをtRPCコンテキストに解決し、`protectedProcedure` でログイン必須のプロシージャを作る
- `apps/api/trpc/routers/auth.ts` — `auth.enabled`（LINE ログインが有効か）と `auth.me`(ログイン状態確認。未ログイン時は `null`）

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
