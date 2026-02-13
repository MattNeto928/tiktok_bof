import { createContext, useContext, useState, type ReactNode } from "react";

interface AppContextType {
  falApiKey: string;
  setFalApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [falApiKey, setFalApiKeyState] = useState(
    () => localStorage.getItem("tiktok-bof-fal-key") || ""
  );
  const [geminiApiKey, setGeminiApiKeyState] = useState(
    () => localStorage.getItem("tiktok-bof-gemini-key") || ""
  );
  const [apiUrl, setApiUrlState] = useState(
    () => localStorage.getItem("tiktok-bof-api-url") || ""
  );

  const setFalApiKey = (key: string) => {
    localStorage.setItem("tiktok-bof-fal-key", key);
    setFalApiKeyState(key);
  };

  const setGeminiApiKey = (key: string) => {
    localStorage.setItem("tiktok-bof-gemini-key", key);
    setGeminiApiKeyState(key);
  };

  const setApiUrl = (url: string) => {
    localStorage.setItem("tiktok-bof-api-url", url);
    setApiUrlState(url);
  };

  return (
    <AppContext.Provider
      value={{ falApiKey, setFalApiKey, geminiApiKey, setGeminiApiKey, apiUrl, setApiUrl }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
