import loaderCss from './loader.css?raw';
import loaderHtml from './loader.html?raw';

export function GlobalLoader() {
  return (
    <>
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
      <style dangerouslySetInnerHTML={{ __html: loaderCss }} />
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
      <div dangerouslySetInnerHTML={{ __html: loaderHtml }} />
    </>
  );
}
