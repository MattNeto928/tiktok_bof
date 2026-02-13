import { createContext, useContext, useState, type ReactNode } from "react";

export const DEFAULT_IMAGE_PROMPT =
  "put a SINGULAR realistic display setup for the product here inside of a generic store that isn't branded. ensure it is the main focus and there isn't anything that isn't the product near it. ENSURE THERE ARE NO PRICE TAGS.";
export const DEFAULT_VIDEO_PROMPT =
  "bring the camera closer to the product and add a hand";
export const DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana-pro/edit";
export const DEFAULT_VIDEO_MODEL = "fal-ai/kling-video/v2.6/pro/image-to-video";

export const IMAGE_MODEL_OPTIONS = [
  { label: "Nano Banana PRO Edit (default)", value: "fal-ai/nano-banana-pro/edit" },
  { label: "Nano Banana Edit", value: "fal-ai/nano-banana/edit" },
  { label: "FLUX.1 Dev", value: "fal-ai/flux/dev" },
  { label: "FLUX Pro", value: "fal-ai/flux-pro" },
  { label: "FLUX Schnell", value: "fal-ai/flux/schnell" },
  { label: "Grok Imagine Image", value: "xai/grok-imagine-image" },
  { label: "Recraft V3", value: "fal-ai/recraft-v3" },
];

export const VIDEO_MODEL_OPTIONS = [
  { label: "Kling 2.6 Pro (default)", value: "fal-ai/kling-video/v2.6/pro/image-to-video" },
  { label: "Grok Imagine Video", value: "xai/grok-imagine-video/image-to-video" },
  { label: "Kling v3 Pro", value: "fal-ai/kling-video/v3/pro/image-to-video" },
  { label: "MiniMax Hailuo", value: "fal-ai/minimax/video-01/image-to-video" },
  { label: "Veo 2", value: "fal-ai/veo2/image-to-video" },
];

export const MODEL_PRICING: Record<string, { costPerUnit: number; unit: string }> = {
  // Image models
  "fal-ai/nano-banana-pro/edit": { costPerUnit: 0.15, unit: "image" },
  "fal-ai/nano-banana/edit": { costPerUnit: 0.039, unit: "image" },
  "fal-ai/flux/dev": { costPerUnit: 0.025, unit: "image" },
  "fal-ai/flux-pro": { costPerUnit: 0.05, unit: "image" },
  "fal-ai/flux/schnell": { costPerUnit: 0.003, unit: "image" },
  "xai/grok-imagine-image": { costPerUnit: 0.07, unit: "image" },
  "fal-ai/recraft-v3": { costPerUnit: 0.05, unit: "image" },
  // Video models (5s default duration)
  "fal-ai/kling-video/v2.6/pro/image-to-video": { costPerUnit: 0.35, unit: "video" },
  "xai/grok-imagine-video/image-to-video": { costPerUnit: 0.20, unit: "video" },
  "fal-ai/kling-video/v3/pro/image-to-video": { costPerUnit: 0.35, unit: "video" },
  "fal-ai/minimax/video-01/image-to-video": { costPerUnit: 0.30, unit: "video" },
  "fal-ai/veo2/image-to-video": { costPerUnit: 0.50, unit: "video" },
};

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
  imageReviewMode: boolean;
  setImageReviewMode: (enabled: boolean) => void;
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
  const [imageReviewMode, setImageReviewModeState] = useState(
    () => localStorage.getItem("tiktok-bof-image-review") === "true"
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

  const setImageReviewMode = (enabled: boolean) => {
    localStorage.setItem("tiktok-bof-image-review", String(enabled));
    setImageReviewModeState(enabled);
  };

  return (
    <AppContext.Provider
      value={{
        falApiKey, setFalApiKey,
        imagePrompt, setImagePrompt,
        videoPrompt, setVideoPrompt,
        imageModel, setImageModel,
        videoModel, setVideoModel,
        imageReviewMode, setImageReviewMode,
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
