/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_MEDIA_URL?: string;
  readonly VITE_IMAGEKIT_URL_ENDPOINT?: string;
  readonly VITE_AUTH_REQUIRED?: "true" | "false";
}
