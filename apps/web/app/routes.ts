import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/index.tsx', [
    route('/', 'routes/shop/index.tsx'),
    route('/shop/:id', 'routes/shop/detail.tsx'),
  ]),
  // 地図に紐づかない独立したページのため AppLayout の外側（トップレベル）に置く。
  route('/grandprix', 'routes/grandprix/index.tsx'),
  route('/questionnaire', 'routes/questionnaire/index.tsx'),
] satisfies RouteConfig;
