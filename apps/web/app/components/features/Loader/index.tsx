import loaderCss from './loader.css?raw';
import loaderHtml from './loader.html?raw';

export function GlobalLoader() {
  return (
    <>
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: ビルド時に取り込んだ自前の静的ファイルだけを埋め込み、外部からの入力は含まない */}
      <style dangerouslySetInnerHTML={{ __html: loaderCss }} />
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: ビルド時に取り込んだ自前の静的ファイルだけを埋め込み、外部からの入力は含まない */}
      <div dangerouslySetInnerHTML={{ __html: loaderHtml }} />
    </>
  );
}
