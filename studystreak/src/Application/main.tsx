import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from "@/Auth/context/AuthProvider.tsx";

// Register the service worker. Prompt user when new content is available.
registerSW({ immediate: true, onNeedRefresh() {}, onOfflineReady() {} })

// Detect in-app browsers and suggest opening in external browser
function isInAppBrowser() {
  const userAgent = navigator.userAgent || '';
  
  // Check for Facebook, Instagram, Messenger, etc.
  return (/FBAN|FBAV|Instagram|Messenger|Twitter/i.test(userAgent));
}

// Better in-app browser handler with custom UI
function handleInAppBrowser() {
  if (isInAppBrowser()) {
    // Create a custom modal instead of using confirm()
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(0,0,0,0.8); 
        z-index: 9999; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          background: white; 
          padding: 2rem; 
          border-radius: 12px; 
          text-align: center; 
          max-width: 300px;
          margin: 1rem;
        ">
          <h3 style="margin: 0 0 1rem 0; color: #333;">Better Experience Available</h3>
          <p style="margin: 0 0 1.5rem 0; color: #666; line-height: 1.4;">
            For the best experience, please open this link in your browser.
          </p>
          <button id="open-browser" style="
            background: #007acc; 
            color: white; 
            border: none; 
            padding: 0.75rem 1.5rem; 
            border-radius: 6px; 
            margin-right: 0.5rem;
            cursor: pointer;
          ">Open in Browser</button>
          <button id="continue-anyway" style="
            background: transparent; 
            color: #666; 
            border: 1px solid #ddd; 
            padding: 0.75rem 1.5rem; 
            border-radius: 6px;
            cursor: pointer;
          ">Continue Anyway</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('open-browser')?.addEventListener('click', () => {
      window.location.href = 'https://studystreak-peach.vercel.app';
    });
    
    document.getElementById('continue-anyway')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
}

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

// Initialize theme and check for in-app browser before rendering
initializeTheme();
handleInAppBrowser();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);