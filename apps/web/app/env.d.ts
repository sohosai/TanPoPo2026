interface ImportMetaEnv {
  /** MapTiler の API キー（地図の背景タイルとフォント）。ビルド時に埋め込まれる。 */
  readonly VITE_MAPTILER_KEY?: string;
  /** LINE Front-end Framework (LIFF) の ID。設定すると自動でLINEアプリへのログインを行う。 */
  readonly VITE_LIFF_ID?: string;
  /** Google Analytics の測定 ID。本番のビルドでだけ設定し、未設定なら計測タグを出さない。 */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** OGP の URL に使う配信先のオリジン。zoo のビルドで設定し、未設定なら本番のオリジンにする。 */
  readonly VITE_SITE_ORIGIN?: string;
}

/** ビルドごとに変わる識別子。vite.config.ts の define で埋め込む。 */
declare const __BUILD_ID__: string;
