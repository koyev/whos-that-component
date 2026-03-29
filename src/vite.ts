import type { Plugin } from "vite";
import type { WhosThatElementOptions } from "./types.js";
import { transform } from "./core/transform.js";
import { getClientModule } from "./core/client.js";
import { createMiddleware } from "./core/server.js";

const SUPPORTED = /\.(jsx?|tsx?|vue|svelte)$/;
const VIRTUAL_CLIENT_ID = "\0virtual:wte-client";

export default function wte(options: WhosThatElementOptions = {}): Plugin {
  const { triggerKey = "Alt", editor = "vscode", enabled } = options;
  const middleware = createMiddleware({ editor });

  // Updated in configureServer once the server is actually listening.
  // Important in cross-origin setups like Laravel where HTML is served by
  // PHP on a different port.
  let serverOrigin = "http://localhost:5173";

  return {
    name: "whos-that-element",
    enforce: "pre",
    apply: "serve", // never runs during `vite build`

    configureServer(server) {
      server.middlewares.use(middleware);

      server.httpServer?.on("listening", () => {
        const addr = server.httpServer?.address();
        if (addr && typeof addr === "object") {
          const host =
            addr.address === "::" || addr.address === "0.0.0.0"
              ? "localhost"
              : addr.address;
          serverOrigin = `http://${host}:${addr.port}`;
        }
      });
    },

    // Intercept `import 'whos-that-element/client'` and return the real
    // client script with the correct Vite server endpoint baked in.
    resolveId(id) {
      if (id === "whos-that-element/client") return VIRTUAL_CLIENT_ID;
    },

    load(id, opts) {
      if (id !== VIRTUAL_CLIENT_ID) return;
      // Return a no-op in SSR context — DOM APIs don't exist in Node.js.
      if (opts?.ssr) return "export {}";
      return getClientModule({ triggerKey, endpoint: `${serverOrigin}/__wte/open` });
    },

    transform(code, id) {
      if (enabled === false) return null;
      if (process.env.NODE_ENV === "production") return null;
      if (id.includes("node_modules") || id.includes(".git")) return null;
      if (!SUPPORTED.test(id)) return null;
      return transform(code, id);
    },
  };
}
