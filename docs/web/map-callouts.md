# 地図の吹き出し

地図上のステージ（と、指定した建物）の真上に吹き出しを出す。対象は `apps/web/app/components/features/Map/data/callouts.json` で決め、表示は `MapCallouts.tsx` が行う。アプリ本体と埋め込み（`/embed`）の両方に出る。

```jsonc
{
  "buildings": [],
  "stages": {
    "stage-united": {
      "url": "https://live.sohosai.com/?channel=uni",
      "thumbnail": "/stage/ユニステ.webp"
    }
  }
}
```

## ステージ

`stages` に書いたステージに、配信のサムネイルとステージ名を出す。押すと `url` を新しいタブで開く。

- キーはステージの `placeId`（`apps/api/trpc/routers/place.ts`）。配信の無いステージは書かない。
- `thumbnail` は `/` で始めると `apps/web/public` 配下のファイル（今は `public/stage/`）、`https://` で始めると外部の画像。
- 建物のピンが出るズーム（15.8）から出す。

## 建物

`buildings` に書いた建物に、建物名・企画数と、中の企画（アイコンと企画名）を出す。企画はランダムな順に 4 秒ごとに下から送り出す。押すとその建物の企画一覧（`/place/:placeId`）を開く。

- 建物は数が多く地図を覆いやすいため、企画数が並ぶズーム（17.4）まで寄ってから出す。
- 今は空（建物の吹き出しは出さない）。

## 重なり

吹き出しどうしが重なったときは、ステージ（`stages` に書いた順）、建物（`buildings` に書いた順）の順に残し、後のものを隠す。地図を動かすたびに並べ直す。

吹き出しの上でのクリックは吹き出しだけが受け、下にある建物やピンは開かない。

## 検証

`bun run check:map-data` が、`placeId` が実在してステージ・建物の種類が合っているか、配信の URL が https か、`/` で始まるサムネイルが `apps/web/public` にあるかを確かめる。
