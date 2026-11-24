import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const browserTargets = ["chrome87", "edge88", "firefox78", "safari14"];

export default defineConfig(({ mode }) => ({
  build: { target: browserTargets },
  plugins: [
    react(),
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
        globIgnores: ["images/**", "**/*.map"],
      },
      devOptions: {
        enabled: mode === "pwa",
        type: "module",
        navigateFallback: "/index.html",
      },
    }),
  ],
}));
