import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("search", "routes/search/index.tsx", [
    route("", "routes/search/list.tsx"),
    route("shop/:id", "routes/search/shop.tsx"),
  ]),
] satisfies RouteConfig;