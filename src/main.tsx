import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AlbumAccess from "./components/AlbumAccess";
import { ImageKitProvider } from "@imagekit/react";
import { imageKitEndpoint } from "./lib/imagekit";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ImageKitProvider
          urlEndpoint={imageKitEndpoint}
          transformationPosition="path"
        >
          <AlbumAccess>
            <App />
          </AlbumAccess>
        </ImageKitProvider>
      </MotionConfig>
    </AppErrorBoundary>
  </React.StrictMode>,
);
