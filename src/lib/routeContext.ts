// src/lib/routeContext.ts
export type RouteContext<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};
