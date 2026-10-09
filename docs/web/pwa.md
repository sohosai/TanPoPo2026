# PWA（ホーム画面への追加とオフライン表示）

ホーム画面に追加でき、一度開いた端末では電波が届かなくても企画・地図を見られる。

| ファイル | 役割 |
| --- | --- |
| `apps/web/public/manifest.webmanifest`・`public/icons/` | アプリ名・アイコン・表示モード |
| `apps/web/scripts/build-sw.ts` | `build` の最後に `build/client/sw.js` を Workbox で生成する |
| `apps/web/app/lib/pwa.ts` | Service Worker の登録と更新検知、追加方法の判定、オンライン状態 |
| `apps/web/app/lib/trpc-provider.tsx` | 公開データのクエリを IndexedDB に保存・復元する |
| `apps/web/app/components/features/Pwa/InstallControl.tsx` | 地図右下の追加ボタンと案内ダイアログ |
| `apps/web/app/components/features/Pwa/UpdateToast.tsx` | 新しい版の案内 |

Service Worker は本番ビルドでだけ登録する。`bun run dev` では動かない。

## ホーム画面への追加

環境ごとに追加の方法が違うため、`useInstallMethod()` で出し分ける。追加済み（standalone で起動中）のときは何も出さない。

| 環境 | 方法 | 初回の自動表示 |
| --- | --- | --- |
| Chromium 系（Android Chrome、PC の Chrome・Edge） | 「追加する」でブラウザの確認を出す | する |
| iOS | 共有メニューからの手順を出す | する |
| LINE などのアプリ内ブラウザ | 追加できない旨と「ブラウザで開く」を出す | しない |
| その他 | ボタン自体を出さない | – |

初回の自動表示は端末ごとに一度だけ（`localStorage` の `tanpopo-install-intro-seen`）。以降は地図右下のボタンからいつでも開ける。Chromium 系でブラウザの確認を断ると、ブラウザが次に `beforeinstallprompt` を発火するまでボタンは消える。

## オフラインで使えるもの

| データ | 保存先 | 保存のタイミング |
| --- | --- | --- |
| 画面のファイル（JS・CSS・HTML・アイコン）とキャンパスの建物・通路データ | Service Worker の precache | Service Worker のインストール時 |
| 企画（`project.list`、詳細を含む全件）と場所（`place.list`） | IndexedDB（TanStack Query の永続化） | 取得するたび。7 日で破棄し、デプロイでも破棄する |
| 企画画像 | Service Worker（CacheFirst） | 表示したもの |
| 地図の背景タイル・文字・アイコン（MapTiler など） | Service Worker（CacheFirst） | 表示した範囲 |
| Google Fonts | Service Worker | 表示したもの |

`project.list` は詳細（説明文・画像・リンク）まで含めて返すため、一覧を一度取得すれば、開いていない企画の詳細もオフラインで見られる。

tRPC の応答は Service Worker では保存しない。`httpBatchLink` が複数のクエリを 1 つの URL にまとめるため、URL 単位の保存では当たらないことがある。

保存するクエリは誰が見ても同じ公開データ（`project.*`・`place.*`）に限る。`auth.me` などの個人データは端末に残さない。

## オフラインで使えないもの

LINE ログインが要るグランプリ投票・来場者アンケートは使えない。オフラインの間は、入口のバナーに「オフライン中は利用不可」と出し、ページを開いても LINE ログインを始めずに案内だけを出す。通信が戻ると自動で通常の表示に戻る。送信の再試行（Background Sync）はしない。

## 更新

新しい版の Service Worker はダウンロード後に待機させ、画面上部に「新しい版があります」を出す。「更新」を押すと切り替えて読み込み直す。

勝手に切り替えないのは、古い版の画面が後から読み込むファイルがデプロイで消えていて、表示が壊れるため。別のタブで切り替えた場合も、他のタブは読み込み直す。ホーム画面から開いたアプリは閉じられずに使われ続けるため、画面に戻ってきたときにも更新を確かめる。
