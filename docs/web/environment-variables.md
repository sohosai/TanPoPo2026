# Web Environment Variables

| 環境変数名 | デフォルト値 | 説明 |
| --- | --- | --- |
| `PORT` | `5173` | Web開発サーバーのポート |
| `VITE_MAPTILER_KEY` | なし | [MapTiler](https://cloud.maptiler.com/account/keys/) の API キー。地図の背景タイルとフォントの取得に使う。未設定だと地図の背景が表示されない |

`apps/web/.env` に書く（`apps/web/.env.example` を参照）。`VITE_` で始まる値はビルド時に JS へ埋め込まれ、ブラウザから見える。MapTiler のキーは公開前提のものなので、MapTiler の管理画面で使えるドメイン（本番のドメインと `localhost`）を制限しておく。

地図スタイル（`sohosai-map.json`）にはキーを書かず、`MapView.tsx` が MapTiler へのリクエストにだけキーを付ける。
