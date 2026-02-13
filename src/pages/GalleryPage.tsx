import { useState, useEffect } from "react";
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
        // Single file, just open it
        window.open(data.urls[0].downloadUrl, "_blank");
      } else {
        // Multiple files, create ZIP
        const zip = new JSZip();

        for (const item of data.urls) {
          try {
            const res = await fetch(item.downloadUrl);
            const blob = await res.blob();
            const video = videos.find(
              (v) =>
                v.batchId === item.batchId && v.productId === item.productId
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20">
            <Film className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Video Gallery</h1>
            <p className="text-sm text-slate-400">
              {videos.length} completed videos
            </p>
          </div>
        </div>

        {videos.length > 0 && (
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="btn-secondary flex items-center gap-2">
              {selected.size === videos.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selected.size === videos.length ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={downloadSelected}
              disabled={selected.size === 0 || downloading}
              className="btn-primary flex items-center gap-2"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading videos...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="glass-card p-12 text-center">
          <PackageOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-300 mb-1">
            No videos yet
          </h2>
          <p className="text-sm text-slate-500">
            Videos will appear here after the pipeline completes processing.
          </p>
        </div>
      )}

      {/* Video Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((v) => {
            const key = `${v.batchId}/${v.productId}`;
            const isSelected = selected.has(key);

            return (
              <div
                key={key}
                className={`glass-card overflow-hidden group cursor-pointer transition-all duration-200 ${
                  isSelected ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-dark-900" : ""
                }`}
              >
                {/* Video thumbnail / preview area */}
                <div
                  className="relative aspect-[9/16] bg-dark-700 flex items-center justify-center"
                  onClick={() => setPreviewVideo(v)}
                >
                  {v.generatedImageUrl ? (
                    <img
                      src={v.generatedImageUrl}
                      alt={v.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(key);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 backdrop-blur-sm hover:bg-dark-700 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Product info */}
                <div className="p-3">
                  <p className="text-sm text-white font-medium truncate">
                    {v.productName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {v.completedAt
                      ? new Date(v.completedAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="glass-card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-dark-600">
              <p className="text-white font-semibold truncate pr-4">
                {previewVideo.productName}
              </p>
              <button onClick={() => setPreviewVideo(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              </button>
            </div>
            <div className="aspect-[9/16] bg-black">
              {previewVideo.videoUrl ? (
                <video
                  src={previewVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  Video not available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
