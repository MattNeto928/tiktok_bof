import { useState } from "react";
import { useAppContext } from "../lib/store";
import { Settings, Key, Globe, Save, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { falApiKey, setFalApiKey, geminiApiKey, setGeminiApiKey, apiUrl, setApiUrl } =
    useAppContext();

  const [localFalKey, setLocalFalKey] = useState(falApiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setFalApiKey(localFalKey);
    setGeminiApiKey(localGeminiKey);
    setApiUrl(localApiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
          <Settings className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Configure your API keys and backend URL</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* fal.ai API Key */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
            <Key className="w-4 h-4 text-indigo-400" />
            fal.ai API Key
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="Enter your fal.ai API key..."
            value={localFalKey}
            onChange={(e) => setLocalFalKey(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Used for Nano Banana (image gen) and Grok Imagine Video (video gen)
          </p>
        </div>

        {/* Gemini API Key */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
            <Key className="w-4 h-4 text-purple-400" />
            Gemini API Key
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="Enter your Gemini API key..."
            value={localGeminiKey}
            onChange={(e) => setLocalGeminiKey(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Reserved for future use (prompt enhancement, etc.)
          </p>
        </div>

        {/* Backend URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            Backend API URL
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="https://your-api-id.execute-api.us-east-1.amazonaws.com"
            value={localApiUrl}
            onChange={(e) => setLocalApiUrl(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            API Gateway endpoint from CDK deploy output
          </p>
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
