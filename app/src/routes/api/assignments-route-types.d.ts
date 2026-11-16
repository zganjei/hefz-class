import type { Route as RootRoute } from "../__root";
declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/api/assignments": { id: "/api/assignments"; path: "/api/assignments"; fullPath: "/api/assignments"; preLoaderRoute: typeof import("./assignments").Route; parentRoute: typeof RootRoute };
  }
}
