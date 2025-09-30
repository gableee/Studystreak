import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from "@/Auth/context/AuthProvider.tsx";

// Register the service worker. Prompt user when new content is available.
// registerSW returns a function to trigger update when available; we capture update handler and the prompt event
const updateSW = registerSW({
});

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

// re-register with callbacks handled inline (we captured updateSW above)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('Service worker update available');
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.info('Offline ready');
    window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
  }
});

// Capture beforeinstallprompt to show a custom Install button in the UI
window.addEventListener('beforeinstallprompt', (e: Event) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Save the event for later to trigger prompt on user gesture
  deferredInstallPrompt = e as BeforeInstallPromptEvent;
  // You can dispatch a custom event or set a global so your UI can show an install button
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// Expose simple helpers on window for UI code to use (optional)
declare global {
  interface Window {
    __pwa?: {
  promptInstall: () => Promise<{ outcome: 'accepted' | 'dismissed' } | false>
      updateServiceWorker: () => void
    }
  }
}

window.__pwa = {
  promptInstall: async () => {
    if (!deferredInstallPrompt) return false;
    try {
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return choiceResult;
    } catch (err) {
      console.warn('Install prompt failed', err);
      return false;
    }
  },
  updateServiceWorker: () => {
    if (typeof updateSW === 'function') {
      updateSW();
    } else {
      console.info('No update function available');
    }
  }
};

// Detect in-app browsers and suggest opening in external browser
function isInAppBrowser() {
  const userAgent = navigator.userAgent || '';
  
  // Check for Facebook, Instagram, Messenger, etc.
  return (/FBAN|FBAV|Instagram|Messenger|Twitter/i.test(userAgent));
}

// Better in-app browser handler with custom UI
function handleInAppBrowser() {
  if (isInAppBrowser()) {
    // Prevent duplicate modals
    if (document.getElementById('in-app-browser-modal')) return;

    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'in-app-browser-modal';
    modal.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100vw; 
        height: 100vh; 
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
          max-width: 320px;
          margin: 1rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        ">
          <h3 style="margin: 0 0 1rem 0; color: #333;">Better Experience Available</h3>
          <p style="margin: 0 0 1.5rem 0; color: #666; line-height: 1.4;">
            For the best experience, please open this link in your browser.<br>
            <span style="font-size:0.95em;color:#888;">(Tap ⋮ copy the link below)</span>
          </p>
          <input id="browser-link" value="https://studystreak-peach.vercel.app" readonly style="
            width: 100%; margin-bottom: 1rem; padding: 0.5rem; border-radius: 6px; border: 1px solid #ddd; text-align: center; font-size: 1em;
          " />
          <button id="copy-link" style="background:#10b981;color:white;border:none;padding:0.75rem 1.5rem;border-radius:6px;margin-right:0.5rem;cursor:pointer;font-weight:500;">
            Copy Link
          </button>
          <button id="continue-anyway" style="background:transparent;color:#666;border:1px solid #ddd;padding:0.75rem 1.5rem;border-radius:6px;cursor:pointer;font-weight:500; margin-top: 6px;">
            Continue Anyway
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    // Add event listeners safely after modal is in DOM
    setTimeout(() => {
      document.getElementById('copy-link')?.addEventListener('click', () => {
        const input = document.getElementById('browser-link') as HTMLInputElement;
        input.select();
        document.execCommand('copy');
        alert('Link copied! Paste it in your browser.');
      });
      document.getElementById('continue-anyway')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = ''; // Restore scroll
      });
    }, 0);
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