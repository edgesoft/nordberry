import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    
    remix({
      noExternal: ["@clerk/remix"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    host: true, // Valfritt: Kan hjälpa att säkerställa att servern lyssnar på 0.0.0.0
      port: 5173,
    allowedHosts: [
      // Lägg till ditt NGROK-värdnamn från felmeddelandet HÄR:
      '1851-158-174-158-78.ngrok-free.app',

      // Lägg till fler om du behöver, t.ex. om du använder andra tunnlar
      // localhost och 127.0.0.1 är oftast tillåtna som standard ändå
    ],
  },
});

