import type { Route as RootRoute } from "./__root";
declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/api/bootstrap": { id: "/api/bootstrap"; path: "/api/bootstrap"; fullPath: "/api/bootstrap"; preLoaderRoute: typeof import("./routes/api/bootstrap").Route; parentRoute: typeof RootRoute };
    "/api/classes": { id: "/api/classes"; path: "/api/classes"; fullPath: "/api/classes"; preLoaderRoute: typeof import("./routes/api/classes").Route; parentRoute: typeof RootRoute };
    "/api/invitations": { id: "/api/invitations"; path: "/api/invitations"; fullPath: "/api/invitations"; preLoaderRoute: typeof import("./routes/api/invitations").Route; parentRoute: typeof RootRoute };
    "/api/reports": { id: "/api/reports"; path: "/api/reports"; fullPath: "/api/reports"; preLoaderRoute: typeof import("./routes/api/reports").Route; parentRoute: typeof RootRoute };
    "/api/reports/review": { id: "/api/reports/review"; path: "/api/reports/review"; fullPath: "/api/reports/review"; preLoaderRoute: typeof import("./routes/api/reports.review").Route; parentRoute: typeof RootRoute };
    "/api/auth/login": { id: "/api/auth/login"; path: "/api/auth/login"; fullPath: "/api/auth/login"; preLoaderRoute: typeof import("./routes/api/auth.login").Route; parentRoute: typeof RootRoute };
    "/api/auth/logout": { id: "/api/auth/logout"; path: "/api/auth/logout"; fullPath: "/api/auth/logout"; preLoaderRoute: typeof import("./routes/api/auth.logout").Route; parentRoute: typeof RootRoute };
    "/api/auth/me": { id: "/api/auth/me"; path: "/api/auth/me"; fullPath: "/api/auth/me"; preLoaderRoute: typeof import("./routes/api/auth.me").Route; parentRoute: typeof RootRoute };
    "/api/auth/register": { id: "/api/auth/register"; path: "/api/auth/register"; fullPath: "/api/auth/register"; preLoaderRoute: typeof import("./routes/api/auth.register").Route; parentRoute: typeof RootRoute };
  }
}
