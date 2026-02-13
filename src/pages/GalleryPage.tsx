import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  listBatches,
  getBatchDetail,
  getDownloadUrls,
  type Product,
} from "../lib/api";
import {
  Film,
  Download,
  CheckSquare,
  Square,
  Loader2,
  X,
  Play,
  PackageOpen,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function GalleryPage() {
  const [videos, setVideos] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Product | null>(null);

  useEffect(() => {
    loadAllCompletedVideos();
  }, []);

  const loadAllCompletedVideos = async () => {
    try {
      const { data: batchData } = await listBatches();
      const allVideos: Product[] = [];

      for (const batch of batchData.batches || []) {
        const { data: detail } = await getBatchDetail(batch.batchId);
        const completed = detail.products.filter(
          (p) => p.status === "COMPLETED" && p.videoS3Key
        );
        allVideos.push(...completed);
      }

      setVideos(allVideos);
    } catch (err) {
      console.error("Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(videos.map((v) => `${v.batchId}/${v.productId}`)));
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    setDownloading(true);

    try {
      const items = Array.from(selected).map((key) => {
        const [batchId, productId] = key.split("/");
        return { batchId, productId };
      });

      const { data } = await getDownloadUrls(items);

      if (data.urls.length === 1) {
        window.open(data.urls[0].downloadUrl, "_blank");
      } else {
        const zip = new JSZip();

        for (const item of data.urls) {
          try {
            const res = await fetch(item.downloadUrl);
            const blob = await res.blob();
            const video = videos.find(
              (v) => v.batchId === item.batchId && v.productId === item.productId
            );
            const name = video
              ? `${video.productName.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`
              : `${item.productId}.mp4`;
            zip.file(name, blob);
          } catch {
            console.warn(`Failed to download: ${item.s3Key}`);
          }
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `tiktok-bof-videos-${Date.now()}.zip`);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Gallery</h1>
          <p className="text-sm text-slate-500 mt-1">
            {videos.length} completed video{videos.length !== 1 ? "s" : ""}
          </p>
        </div>

        {videos.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="btn-secondary flex items-center gap-2 text-xs py-2 px-3">
              {selected.size === videos.length ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selected.size === videos.length ? "Deselect" : "Select All"}
            </button>
            <button
              onClick={downloadSelected}
              disabled={selected.size === 0 || downloading}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {selected.size > 0 ? `Download (${selected.size})` : "Download"}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="glass-card p-14 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading videos...</p>
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="glass-card p-14 text-center">
          <PackageOpen className="w-8 h-8 text-dark-400 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-400 mb-1">No videos yet</h2>
          <p className="text-xs text-slate-500">
            Videos appear here after pipeline processing completes.
          </p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 stagger-children">
          {videos.map((v) => {
            const key = `${v.batchId}/${v.productId}`;
            const isSelected = selected.has(key);

            return (
              <div
                key={key}
                className={`glass-card overflow-hidden group cursor-pointer transition-all duration-200 ${
                  isSelected ? "ring-1 ring-accent ring-offset-1 ring-offset-dark-950" : ""
                }`}
              >
                <div
                  className="relative aspect-[9/16] bg-dark-900 flex items-center justify-center"
                  onClick={() => setPreviewVideo(v)}
                >
                  {v.generatedImageUrl ? (
                    <img
                      src={v.generatedImageUrl}
                      alt={v.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-6 h-6 text-dark-500" />
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(key);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {v.productName}
                  </p>
                  <p className="text-[10px] text-dark-400 mt-1">
                    {v.completedAt ? new Date(v.completedAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal — portaled to body so scroll position doesn't affect centering */}
      {previewVideo &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setPreviewVideo(null)}
          >
            <div
              className="glass-card max-w-sm w-full max-h-full flex flex-col overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700 shrink-0">
                <p className="text-white text-sm font-semibold truncate pr-4">
                  {previewVideo.productName}
                </p>
                <button onClick={() => setPreviewVideo(null)}>
                  <X className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
                </button>
              </div>
              <div className="bg-black min-h-0 flex-1">
                {previewVideo.videoUrl ? (
                  <video
                    src={previewVideo.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-400 text-sm">
                    Video not available
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
