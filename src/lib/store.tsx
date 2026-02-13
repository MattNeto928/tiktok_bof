import { createContext, useContext, useState, type ReactNode } from "react";

export const DEFAULT_IMAGE_PROMPT =
  "put a SINGULAR realistic display setup for the product here inside of a generic store that isn't branded. ensure it is the main focus and there isn't anything that isn't the product near it. ENSURE THERE ARE NO PRICE TAGS.";
export const DEFAULT_VIDEO_PROMPT =
  "bring the camera closer to the product and add a hand";
export const DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana/edit";
export const DEFAULT_VIDEO_MODEL = "xai/grok-imagine-video/image-to-video";

export const IMAGE_MODEL_OPTIONS = [
  { label: "Nano Banana Edit (default)", value: "fal-ai/nano-banana/edit" },
  { label: "FLUX.1 Dev", value: "fal-ai/flux/dev" },
  { label: "FLUX Pro", value: "fal-ai/flux-pro" },
  { label: "FLUX Schnell", value: "fal-ai/flux/schnell" },
  { label: "Grok Imagine Image", value: "xai/grok-imagine-image" },
  { label: "Recraft V3", value: "fal-ai/recraft-v3" },
];

export const VIDEO_MODEL_OPTIONS = [
  { label: "Grok Imagine Video (default)", value: "xai/grok-imagine-video/image-to-video" },
  { label: "Kling v3 Pro", value: "fal-ai/kling-video/v3/pro/image-to-video" },
  { label: "MiniMax Hailuo", value: "fal-ai/minimax/video-01/image-to-video" },
  { label: "Veo 2", value: "fal-ai/veo2/image-to-video" },
];

interface AppContextType {
  falApiKey: string;
  setFalApiKey: (key: string) => void;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  videoPrompt: string;
  setVideoPrompt: (prompt: string) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  videoModel: string;
  setVideoModel: (model: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [falApiKey, setFalApiKeyState] = useState(
    () => localStorage.getItem("tiktok-bof-fal-key") || ""
  );
  const [imagePrompt, setImagePromptState] = useState(
    () => localStorage.getItem("tiktok-bof-image-prompt") || DEFAULT_IMAGE_PROMPT
  );
  const [videoPrompt, setVideoPromptState] = useState(
    () => localStorage.getItem("tiktok-bof-video-prompt") || DEFAULT_VIDEO_PROMPT
  );
  const [imageModel, setImageModelState] = useState(
    () => localStorage.getItem("tiktok-bof-image-model") || DEFAULT_IMAGE_MODEL
  );
  const [videoModel, setVideoModelState] = useState(
    () => localStorage.getItem("tiktok-bof-video-model") || DEFAULT_VIDEO_MODEL
  );

  const setFalApiKey = (key: string) => {
    localStorage.setItem("tiktok-bof-fal-key", key);
    setFalApiKeyState(key);
  };

  const setImagePrompt = (prompt: string) => {
    localStorage.setItem("tiktok-bof-image-prompt", prompt);
    setImagePromptState(prompt);
  };

  const setVideoPrompt = (prompt: string) => {
    localStorage.setItem("tiktok-bof-video-prompt", prompt);
    setVideoPromptState(prompt);
  };

  const setImageModel = (model: string) => {
    localStorage.setItem("tiktok-bof-image-model", model);
    setImageModelState(model);
  };

  const setVideoModel = (model: string) => {
    localStorage.setItem("tiktok-bof-video-model", model);
    setVideoModelState(model);
  };

  return (
    <AppContext.Provider
      value={{
        falApiKey, setFalApiKey,
        imagePrompt, setImagePrompt,
        videoPrompt, setVideoPrompt,
        imageModel, setImageModel,
        videoModel, setVideoModel,
      }}
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
