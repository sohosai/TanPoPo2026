import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/index.tsx', [
    route('/', 'routes/project/index.tsx'),
    route('/project/:number', 'routes/project/detail.tsx'),
    route('/place/:placeId', 'routes/place/detail.tsx'),
    route('/area/:areaId', 'routes/area/detail.tsx'),
  ]),
  // 旧 URL（/shop/:number）で共有済みのリンクを新 URL へ引き継ぐ。
  route('/shop/:number', 'routes/project/legacy-redirect.tsx'),
  // 地図に紐づかない独立したページのため AppLayout の外側（トップレベル）に置く。
  route('/grandprix', 'routes/grandprix/index.tsx'),
  route('/questionnaire', 'routes/questionnaire/index.tsx'),
] satisfies RouteConfig;
