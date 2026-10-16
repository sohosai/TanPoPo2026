import StatusPage, {
  statusPageLinks,
  statusPageMeta,
} from '~/components/layouts/StatusPage/StatusPage';
import type { Route } from './+types/not-found';

export const meta: Route.MetaFunction = () =>
  statusPageMeta('ページが見つかりません');

export const links: Route.LinksFunction = () => statusPageLinks;

export default function NotFound() {
  return (
    <StatusPage
      headline="404 NOT FOUND!"
      title="企画検索システム"
      message={
        <>
          お探しのページは見つかりませんでした。
          <br />
          URLが正しいかご確認ください。
        </>
      }
      bubble="道に迷ってしまったそぽ…"
    />
  );
}
