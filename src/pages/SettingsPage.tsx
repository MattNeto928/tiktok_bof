import { useState } from "react";
import {
  useAppContext,
  DEFAULT_IMAGE_PROMPT,
  DEFAULT_VIDEO_PROMPT,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
  MODEL_PRICING,
} from "../lib/store";
import { Key, Save, CheckCircle, MessageSquare, RotateCcw, Cpu, Eye } from "lucide-react";

export default function SettingsPage() {
  const {
    falApiKey, setFalApiKey,
    imagePrompt, setImagePrompt,
    videoPrompt, setVideoPrompt,
    imageModel, setImageModel,
    videoModel, setVideoModel,
    imageReviewMode, setImageReviewMode,
  } = useAppContext();

  const [localFalKey, setLocalFalKey] = useState(falApiKey);
  const [localImagePrompt, setLocalImagePrompt] = useState(imagePrompt);
  const [localVideoPrompt, setLocalVideoPrompt] = useState(videoPrompt);
  const [localImageModel, setLocalImageModel] = useState(imageModel);
  const [localVideoModel, setLocalVideoModel] = useState(videoModel);
  const [localImageReviewMode, setLocalImageReviewMode] = useState(imageReviewMode);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setFalApiKey(localFalKey);
    setImagePrompt(localImagePrompt);
    setVideoPrompt(localVideoPrompt);
    setImageModel(localImageModel);
    setVideoModel(localVideoModel);
    setImageReviewMode(localImageReviewMode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetPrompts = () => {
    setLocalImagePrompt(DEFAULT_IMAGE_PROMPT);
    setLocalVideoPrompt(DEFAULT_VIDEO_PROMPT);
  };

  const resetModels = () => {
    setLocalImageModel(DEFAULT_IMAGE_MODEL);
    setLocalVideoModel(DEFAULT_VIDEO_MODEL);
  };

  const selectedImageLabel = IMAGE_MODEL_OPTIONS.find((o) => o.value === localImageModel)?.label || localImageModel;
  const selectedVideoLabel = VIDEO_MODEL_OPTIONS.find((o) => o.value === localVideoModel)?.label || localVideoModel;

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">API keys, models, and generation prompts</p>
      </div>

      <div className="space-y-5">
        {/* fal.ai API Key */}
        <div className="glass-card p-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
            <Key className="w-4 h-4 text-accent" />
            fal.ai API Key
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="Enter your fal.ai API key..."
            value={localFalKey}
            onChange={(e) => setLocalFalKey(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">
            Used for {selectedImageLabel} (images) and {selectedVideoLabel} (video)
          </p>
        </div>

        {/* Model Selection */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Cpu className="w-4 h-4 text-accent" />
              Model Selection
            </label>
            <button
              onClick={resetModels}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Defaults
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Image Model</label>
              <select
                className="input-field"
                value={localImageModel}
                onChange={(e) => setLocalImageModel(e.target.value)}
              >
                {IMAGE_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                Model used for product image generation
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Video Model</label>
              <select
                className="input-field"
                value={localVideoModel}
                onChange={(e) => setLocalVideoModel(e.target.value)}
              >
                {VIDEO_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                Model used for image-to-video generation
              </p>
            </div>
          </div>

          {/* Pricing info */}
          {(() => {
            const imgPrice = MODEL_PRICING[localImageModel];
            const vidPrice = MODEL_PRICING[localVideoModel];
            return (imgPrice || vidPrice) ? (
              <div className="mt-4 pt-4 border-t border-dark-700">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Cost per product</p>
                <div className="flex gap-4 text-xs text-slate-400">
                  {imgPrice && <span>${imgPrice.costPerUnit.toFixed(3)}/{imgPrice.unit}</span>}
                  {vidPrice && <span>${vidPrice.costPerUnit.toFixed(2)}/{vidPrice.unit}</span>}
                  {imgPrice && vidPrice && (
                    <span className="text-accent font-medium">
                      = ${(imgPrice.costPerUnit + vidPrice.costPerUnit).toFixed(2)} total
                    </span>
                  )}
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Image Review Mode */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-semibold text-slate-300">Review Images Before Video</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate images first, review and approve them, then generate videos only for approved images
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocalImageReviewMode(!localImageReviewMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                localImageReviewMode ? "bg-accent" : "bg-dark-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  localImageReviewMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Generation Prompts */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <MessageSquare className="w-4 h-4 text-accent" />
              Generation Prompts
            </label>
            <button
              onClick={resetPrompts}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Defaults
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Image Prompt</label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                placeholder="Enter image generation prompt..."
                value={localImagePrompt}
                onChange={(e) => setLocalImagePrompt(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Sent to {selectedImageLabel} for product image generation
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Video Prompt</label>
              <textarea
                className="input-field min-h-[60px] resize-y"
                placeholder="Enter video generation prompt..."
                value={localVideoPrompt}
                onChange={(e) => setLocalVideoPrompt(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Sent to {selectedVideoLabel} for video generation
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2 w-full justify-center"
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
