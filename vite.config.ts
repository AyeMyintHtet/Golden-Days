import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handleAlbumApi } from "./server/album-api";

const browserTargets = ["chrome87", "edge88", "firefox78", "safari14"];

export default defineConfig(({ mode }) => {
  // These values stay in the Node development middleware. They are never
  // assigned to Vite's `define` or exposed through a VITE_ secret.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  return {
    server: {
      host: true,
    },
    build: {
      target: browserTargets,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/three/")) return "three-loader";
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: "private-album-api",
        configureServer(server) {
          server.middlewares.use("/api/album", (request, response, next) => {
            void handleAlbumApi(request, response, env).catch(next);
          });
        },
      },
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: false,
        includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
        manifest: {
          id: "/",
          name: "Golden Days",
          short_name: "Golden Days",
          description: "A little home for our family memories.",
          lang: "en",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#f8f5ef",
          theme_color: "#f8f5ef",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        injectManifest: {
          target: browserTargets,
          // Media is cached on demand by src/sw.ts, never during installation.
          globPatterns: ["**/*.{js,css,html,woff,woff2}"],
          globIgnores: [
            "images/**",
            "**/*.map",
            "**/three-loader-*.js",
            "**/MemoryScene-*.js",
          ],
        },
        devOptions: {
          enabled: mode === "pwa",
          type: "module",
          navigateFallback: "/index.html",
        },
      }),
    ],
  };
});
