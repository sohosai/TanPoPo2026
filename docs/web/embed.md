# 地図の埋め込み（iframe）

会場マップだけを他のページに iframe で埋め込める。URL はアプリ本体の URL の先頭に `/embed` を付けたもの。

| URL | 表示 |
| --- | --- |
| `/embed` | 会場全体 |
| `/embed/project/:number` | その企画の場所へ寄せて強調する |
| `/embed/place/:placeId` | その場所へ寄せて強調する |
| `/embed/area/:areaId` | そのエリアが収まるように表示する |

`/embed` の後ろが上のどれにも当たらないときは会場全体を表示する。

```html
<iframe
  src="https://<アプリのドメイン>/embed/project/001"
  width="100%"
  height="400"
  style="border: 0"
  loading="lazy"
  title="雙峰祭 会場マップ"
></iframe>
```

実装: [`apps/web/app/routes/embed.tsx`](../../apps/web/app/routes/embed.tsx)。埋め込みかどうかは URL だけで決まり（[`apps/web/app/lib/embed.ts`](../../apps/web/app/lib/embed.ts)）、地図の部品は本体と共通。

## 本体との違い

| 項目 | 埋め込み |
| --- | --- |
| パネル | 下部シート・サイドパネル（検索・一覧・詳細）は無く、地図だけを出す |
| 地図のピン・建物・エリアのタップ | アプリ本体の該当ページを新しいタブで開く。埋め込み先のページからは離れない |
| 左下 | 「雙峰祭マップで開く」。今の URL に当たるアプリ本体のページを新しいタブで開く |
| 右下のボタン | 会場全体と 3D/2D だけ。iframe では埋め込み先が許可しない限り位置情報が拒否されるため、現在地は出さない |
| 地図の操作 | PC は Ctrl（Mac は ⌘）＋ホイール、スマホは 2 本指のときだけ地図が動く。それ以外は埋め込み先のページのスクロールになる |
| PWA | Service Worker を登録せず、オフライン表示とホーム画面への追加の対象外 |
| 検索エンジン | `noindex` |

## 埋め込みを許すサイト

[`apps/web/public/_headers`](../../apps/web/public/_headers) の `Content-Security-Policy: frame-ancestors` で決める。

| パス | 埋め込める親ページ |
| --- | --- |
| `/embed`、`/embed/*` | 自サイト、`https://sohosai.com`、`https://*.sohosai.com`、`http://localhost:*`、`http://127.0.0.1:*` |
| それ以外 | 自サイトだけ（投票・アンケートを他サイトの iframe に入れて操作させないため） |

Service Worker はページ遷移に保存済みの `index.html`（埋め込みを禁じるヘッダー付き）を返すため、`/embed` はその対象から外し、毎回サーバーから受け取る（[`apps/web/scripts/build-sw.ts`](../../apps/web/scripts/build-sw.ts) の `navigateFallbackDenylist`）。

`_headers` は Cloudflare の静的アセット配信で効くもので、`bun run dev`（Vite）では付かない。
