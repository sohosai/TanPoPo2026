import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/index.tsx', [
    route('/', 'routes/shop/index.tsx'),
    route('/shop/:id', 'routes/shop/detail.tsx'),
  ]),
] satisfies RouteConfig;
