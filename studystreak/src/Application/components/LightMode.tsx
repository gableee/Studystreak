import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // State to track dark/light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check if user has previously selected a theme
    const savedTheme = localStorage.getItem("theme");
    // Check if OS prefers dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Return true for dark mode if saved as 'dark' or if OS prefers dark and no preference saved
    return savedTheme === "dark" || (savedTheme === null && prefersDark);
  });

  // Apply theme whenever isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="rounded-lg p-2 transition-colors hover:bg-slate-200/20 dark:hover:bg-white/10"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-yellow-300" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" />
      )}
    </button>
  );
}
