import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { APP_LANGUAGE, resources } from "./config";

void i18n.use(initReactI18next).init({
  resources,
  lng: APP_LANGUAGE,
  fallbackLng: "en",
  supportedLngs: ["my", "en"],
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "em"] },
});

export default i18n;
