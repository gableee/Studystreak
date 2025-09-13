import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; 
import "./index.css";
import App from "./App.tsx";
import { registerSW } from 'virtual:pwa-register'

// Register the service worker. Prompt user when new content is available.
registerSW({ immediate: true, onNeedRefresh() {}, onOfflineReady() {} })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
