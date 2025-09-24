import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from 'virtual:pwa-register'

// Register the service worker. Prompt user when new content is available.
registerSW({ immediate: true, onNeedRefresh() {}, onOfflineReady() {} })

// Initialize theme based on saved preference or system preference
const initializeTheme = () => {
  // Check if theme is saved in localStorage
  const savedTheme = localStorage.getItem('theme');
  // Check if system prefers dark mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply dark mode if saved as 'dark' or if system prefers dark and no preference is saved
  if (savedTheme === 'dark' || (savedTheme === null && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Initialize theme before rendering
initializeTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
