import en from "./locales/en.json";
import my from "./locales/my.json";

// Change this to "en" to use English. Language is set only in code.
export const APP_LANGUAGE: "my" | "en" = "my";

export const resources = {
  my: { translation: my },
  en: { translation: en },
};
