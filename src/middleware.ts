// Wire src/proxy.ts as Next.js middleware.
// Next.js requires this file to be at src/middleware.ts (or root middleware.ts).
// proxy.ts contains all the logic; this file just re-exports it.
export { proxy as middleware, config } from "./proxy";
