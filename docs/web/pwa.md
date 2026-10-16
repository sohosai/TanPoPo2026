# PWA（オフライン表示）

一度開いた端末では電波が届かなくても企画・地図を見られる。ブラウザのメニューからホーム画面に追加することもできる（アプリ内に追加ボタンは置かない）。

| ファイル | 役割 |
| --- | --- |
| `apps/web/public/manifest.webmanifest`・`public/icons/` | アプリ名・アイコン・表示モード |
| `apps/web/scripts/build-sw.ts` | `build` の最後に `build/client/sw.js` を Workbox で生成する |
| `apps/web/app/lib/pwa.ts` | Service Worker の登録と更新検知、オンライン状態 |
| `apps/web/app/lib/trpc-provider.tsx` | 公開データのクエリを IndexedDB に保存・復元する |
| `apps/web/app/components/features/Pwa/UpdateToast.tsx` | 新しい版の案内 |

Service Worker は本番ビルドでだけ登録する。`bun run dev` では動かない。

## 画面の高さ（iOS）

iOS の Safari・ホーム画面のアプリで、画面の上下に何も描かれない帯が出ないよう、高さの単位を使い分ける。`viewport-fit=cover` は `root.tsx` の viewport で指定済み。

| 対象 | 高さ | 理由 |
| --- | --- | --- |
| 地図（`MapView.tsx`） | `100lvh`（無いブラウザは `100vh`） | `100dvh` は Safari の上下のツールバーの間だけの高さで、半透明のツールバーの裏まで地図が届かず、ページの背景（白）が見える |
| ホーム画面のアプリの `html`（`panda.config.ts` の `globalCss`） | `100vh`（`display-mode: standalone` のときだけ） | `height: 100%` や `100dvh` が画面より短くなり、下端に帯が残ることがある（WebKit bug 301108）。ツールバーの無い standalone では `100vh` が画面の高さそのもの |
| 下部シート（`BottomSheet.tsx`） | Safari では `95dvh`、ホーム画面のアプリでは `95lvh` | Safari ではツールバーの出し入れに合わせて伸縮させる。standalone では上と同じ理由で画面の高さから決める |

- ステータスバーは `apple-mobile-web-app-status-bar-style: default`（不透明）のままにする。`black-translucent` にすると地図をステータスバーの下まで敷けるが、白い文字が明るい地図の上で読みにくく、ホーム画面のアプリの下端に帯が出る不具合も起きやすい。この値は追加した時点で固定されるため、変えたらホーム画面のアプリを追加し直す必要がある。
- Safari 26.0 には、画面いっぱいの固定配置の要素の下に隙間が出る不具合があった（Safari 26.1 で修正済み）。

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

LINE ログインが要るグランプリ投票・来場者アンケートは使えない（LINE ログインを無効にしている間は、そもそも出さない。[line-login.md](../api/line-login.md#機能の有効無効)）。オフラインの間は、入口のバナーに「オフライン中は利用不可」と出し、ページを開いても LINE ログインを始めずに案内だけを出す。通信が戻ると自動で通常の表示に戻る。送信の再試行（Background Sync）はしない。

## 更新

新しい版の Service Worker はダウンロード後に待機させ、画面上部に「新しい版があります」を出す。「更新」を押すと切り替えて読み込み直す。

勝手に切り替えないのは、古い版の画面が後から読み込むファイルがデプロイで消えていて、表示が壊れるため。別のタブで切り替えた場合も、他のタブは読み込み直す。ホーム画面から開いたアプリは閉じられずに使われ続けるため、画面に戻ってきたときにも更新を確かめる。
