# 人流（来場者の位置）

位置情報の説明に同意した来場者の端末から、位置を30秒ごとに受け取って保存し、実行委員会だけが見られるプレビュー（`/crowd`）で全員の位置・移動の経路・会場エリアごとの人数の推移を見る。

```
端末（位置情報に同意・許可済み）──30秒ごと──▶ POST /telemetry/location ──▶ D1: location_points
                                                                         │
                                       Cron（毎分）────────────────────▶ D1: crowd_area_minutes
                                                                         │
Cloudflare Access ─▶ /crowd（プレビュー）◀──── GET /crowd/api/* ◀────────┘
```

## 端末での取得

実装は `apps/web/app/lib/crowdReport.ts`。

- 送り始める条件は、位置情報の説明（`LocationPermissionDialog.tsx`）を承諾し、ブラウザで位置情報を許可していること。説明を経ずに許可済みだった端末からは送らない。現在地ボタンで現在地を表示した時点で始め、以降は現在地の表示をやめても、そのサイトを開いている間は送り続ける。承諾済み・許可済みの端末では、ページを開いた時点で始める。埋め込み（`/embed`）では送らない。
- `watchPosition` を `enableHighAccuracy: true`・`maximumAge: 0` で動かし続け、届いた位置を5秒ごとに区切って、それぞれの中で精度（`accuracy`）のいちばんよい1点を残す。30秒ごとに、その間の点（最大6点）をまとめて送り、30秒の中でいちばん精度のよい点に代表（`primary`）の印を付ける。
- 座標は丸めない。高度・高度の誤差・向き・速さ・端末で測った時刻もそのまま送る。
- 送れなかった分は IndexedDB に貯め、次の送信で古い順に送る（1回 50点まで）。タブが裏に回る直前（`visibilitychange`）には、手元の分を `keepalive` で送り切る。
- 端末 ID はランダムな UUID を `localStorage` に置き、作り直さない。LINE のログインや cookie とは結びつけない。
- スマホのブラウザは、裏に回るか画面を消すと位置情報を止める（Service Worker からも位置情報は使えない）。そのため、スマホでは画面を開いている間の記録になる。

## 受け取りと保存

実装は `apps/api/crowd/routes.ts`（`telemetryRoutes`）。

- `POST /telemetry/location` の本文は `{ deviceId, points }`（`apps/api/domain/crowd.ts` の `LocationReportSchema`）。形が違えば 400、受け付ければ 204 を返す。
- 端末 ID は SHA-256（先頭 16 バイト）にしてから保存し、ID そのものは保存しない。ID は乱数の UUID のため、salt を混ぜなくてもハッシュから ID は戻せない。
- 測った時刻が3日より前・5分より先の点は捨てる（端末の時計のずれ）。
- `location_points` は（端末, 測った時刻）を主キーにし、同じ点の送り直しは無視する。
- 自動では消さない。消すときは `wrangler d1 execute` で手で消す。

## 集計

実装は `apps/api/crowd/aggregate.ts`。Cron Trigger（`wrangler.jsonc` の `triggers.crons`、毎分）で、2分前と15分前の1分間について、会場エリア（地図スタイルの `area-*`）ごとと全体（`all`）の端末の数を数え、`crowd_area_minutes` に書く（書き直しを含む）。15分前の分は、通信が途切れて後から届いた点を拾うため。

ローカルでは `wrangler dev --test-scheduled` で起動し、`/cdn-cgi/handler/scheduled?cron=*+*+*+*+*&time=<UNIX ミリ秒>` を開くと、その時刻の集計を動かせる。

## プレビュー

画面は `apps/web/app/routes/crowd/index.tsx`、データは `/crowd/api/*`（`crowdApiRoutes`）。

| API | 返すもの |
| --- | --- |
| `GET /crowd/api/range` | 記録のある期間 |
| `GET /crowd/api/points?from=&to=` | 期間（最大5分）の全端末のすべての位置（5秒刻み） |
| `GET /crowd/api/device/:device?from=&to=` | 1台の端末の、期間（最大24時間）のすべての位置 |
| `GET /crowd/api/series?from=&to=` | 会場エリアごとの1分ごとの人数（期間は最大4日） |

- 全員の位置（端末ごとの色の点）と軌跡（直前3・5・10分の線）を常に出す。位置は `/points` を5分の区切りごとに取ってキャッシュし（記録の最後を含む区切りだけ30秒ごとに取り直す）、描き替えのたびに前後の点（5秒刻み）の間を補間して、なめらかに動かす（`track.ts` の `frameAt`）。点が1分より空いた端末は、送信が止まったとみなして出さない。再生中は先の区切りも先に取っておく。
- 「跳びを除く」「ならす」は、全員の点・軌跡と選んだ端末の経路の両方にかける。「道に沿わせる」は選んだ端末の経路だけにかける。誤差（`accuracy`）は表示しないが、保存は続け、下のしきい値と経路の後処理に使う。
- 時刻は画面下の時間のバー（`components/features/Crowd/TimeBar.tsx`）で選ぶ。左右にドラッグで動かし、ホイールで拡大・縮小し、押した所の時刻へ移る（矢印キーで1分、Shift と一緒に10分）。動かせるのは雙峰祭の期間（10/30 0:00〜11/2 0:00、日本時間。`api.ts` の `FESTIVAL_START`・`FESTIVAL_END`）の中だけで、日ごとに区切って「前夜祭」「1日目」「2日目」と出し、期間の外は灰色の斜線、期間の中で記録の無い時間帯は薄い色で塗る。再生は 1x・10x・30x・60x・300x で、記録の最後まで来たら最新に戻る。開いた直後と再生を終えた後は最新を追い、30秒ごとに読み直す。
- アプリ本体と同じ会場の建物・テント・ピン（`CampusLayers`）を常に下に重ねる。押しても企画や場所のページは開かない（`interactive={false}`）。人流の点と線は常にその上に描く。軌跡の長さと誤差の上限は、時間のバーの上の段で選ぶ。
- 点を押すとその端末を選び、その日のすべての位置（5秒刻み）を経路として出す。経路には、跳びを除く（時速約 20km を超える移動を除く）・ならす（誤差で重みを付けたカルマンフィルタ）・道に沿わせる（誤差の範囲、最大 20m にある通路 `path-network.geojson` へ寄せる）を切り替えてかけられる（`components/features/Crowd/track.ts`）。元のデータは書き換えない。
- 誤差のしきい値（既定 50m）より大きい位置は出さない。
- 会場エリアごとの人数の推移は、アプリ本体の PC 版の企画一覧と同じ左のパネル（`SidePanel`）に、雙峰祭の期間全体を横軸にした折れ線で出す。パネルの端のつまみで開け閉めし、時間のバーはパネルの右から始める。なぞるとその分の人数を表で出し、押すとその時刻へ移る。

### 保護

- Cloudflare Zero Trust で Self-hosted のアプリケーションを1つ作り、パス `/crowd` と `/crowd/*` を実行委員会のアカウントだけに許可する。設定はこれだけで、環境変数や secret は要らない。
- Worker でも、`/crowd/api/*` へのリクエストの `Cf-Access-Jwt-Assertion` を、チーム（`routes.ts` の `ACCESS_ISSUER`）の鍵で検証し、通らなければ 403 を返す。Access のパスの設定に漏れがあっても、データを出さないようにするため。アプリケーション（AUD）は見ないため、同じチームの別のアプリの JWT も通る。ローカル（localhost）では検証を省く。
- 応答には `Cache-Control: no-store` を付ける。
