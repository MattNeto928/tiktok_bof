import { useState, useEffect, useCallback } from "react";
import { listBatches, getBatchDetail, startPipeline, reviewBatch, type Batch, type BatchDetail } from "../lib/api";
import { useAppContext, MODEL_PRICING } from "../lib/store";
import {
  RefreshCw,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Clock,
  Image as ImageIcon,
  Video,
  X,
  ThumbsUp,
  ThumbsDown,
  Eye,
  AlertCircle,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "badge-pending" },
  IMAGE_GENERATING: { label: "Img Gen", cls: "badge-processing" },
  IMAGE_GENERATED: { label: "Img Done", cls: "badge-processing" },
  VIDEO_GENERATING: { label: "Vid Gen", cls: "badge-processing" },
  COMPLETED: { label: "Done", cls: "badge-completed" },
  FAILED: { label: "Failed", cls: "badge-failed" },
  CANCELLED: { label: "Cancelled", cls: "badge-failed" },
  PROCESSING: { label: "Running", cls: "badge-processing" },
  IMAGE_REVIEW_PENDING: { label: "Review", cls: "badge-pending" },
  REVIEWED: { label: "Reviewed", cls: "badge-completed" },
  REJECTED: { label: "Rejected", cls: "badge-failed" },
};

function getStatus(s: string) {
  return STATUS_MAP[s] || { label: s, cls: "badge-pending" };
}

function ProgressBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const completed = (counts["COMPLETED"] || 0) + (counts["REVIEWED"] || 0);
  const failed = (counts["FAILED"] || 0) + (counts["REJECTED"] || 0);
  const reviewPending = counts["IMAGE_REVIEW_PENDING"] || 0;
  const processing =
    (counts["IMAGE_GENERATING"] || 0) +
    (counts["IMAGE_GENERATED"] || 0) +
    (counts["VIDEO_GENERATING"] || 0);

  return (
    <div className="space-y-2">
      <div className="h-1.5 rounded-full bg-dark-700 overflow-hidden flex">
        {completed > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        )}
        {reviewPending > 0 && (
          <div
            className="h-full bg-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${(reviewPending / total) * 100}%` }}
          />
        )}
        {processing > 0 && (
          <div
            className="h-full bg-sky-400 animate-pulse-glow transition-all duration-700 ease-out"
            style={{ width: `${(processing / total) * 100}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-700 ease-out"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
      </div>
      <div className="flex gap-4 text-[11px] text-slate-500">
        {completed > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {completed} done
          </span>
        )}
        {reviewPending > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {reviewPending} review
          </span>
        )}
        {processing > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            {processing} active
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {failed} failed
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { imageModel, videoModel, falApiKey, imagePrompt, videoPrompt } = useAppContext();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Image review state (keyed by productId)
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, boolean>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await listBatches();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBatchDetail = useCallback(async (batchId: string) => {
    try {
      const { data } = await getBatchDetail(batchId);
      setSelectedBatch(data);
    } catch (err) {
      console.error("Failed to fetch batch detail:", err);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 5000);
    return () => clearInterval(interval);
  }, [fetchBatches]);

  useEffect(() => {
    if (!selectedBatch) return;
    const interval = setInterval(() => fetchBatchDetail(selectedBatch.batchId), 5000);
    return () => clearInterval(interval);
  }, [selectedBatch?.batchId, fetchBatchDetail]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedBatch) {
      await fetchBatchDetail(selectedBatch.batchId);
    } else {
      await fetchBatches();
    }
    setRefreshing(false);
  };

  const [cancelSuccess, setCancelSuccess] = useState(false);

  const handleCancel = async () => {
    if (!selectedBatch || !confirm("Are you sure you want to cancel this batch?")) return;
    setRefreshing(true);
    try {
      const { cancelBatch } = await import("../lib/api");
      await cancelBatch(selectedBatch.batchId);
      setCancelSuccess(true);
      setSelectedBatch(null);
      await fetchBatches();
      setTimeout(() => setCancelSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to cancel batch:", err);
      alert("Failed to cancel batch");
    } finally {
      setRefreshing(false);
    }
  };

  // Image review helpers
  const toggleReviewDecision = (productId: string, approved: boolean) => {
    setReviewDecisions((prev) => {
      // If clicking the same decision, toggle it off (unset)
      if (prev[productId] === approved) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: approved };
    });
  };

  const approveAll = (products: BatchDetail["products"]) => {
    const decisions: Record<string, boolean> = {};
    products.forEach((p) => {
      if (p.status === "IMAGE_REVIEW_PENDING" && p.generatedImageUrl) {
        decisions[p.productId] = true;
      }
    });
    setReviewDecisions(decisions);
  };

  const handleGenerateVideos = async () => {
    if (!selectedBatch || !falApiKey) return;

    const approved = selectedBatch.products.filter(
      (p) => reviewDecisions[p.productId] === true && p.generatedImageUrl
    );
    if (approved.length === 0) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      // Mark all reviewed products in the original batch
      const decisions: Record<string, "approved" | "rejected"> = {};
      for (const [productId, isApproved] of Object.entries(reviewDecisions)) {
        decisions[productId] = isApproved ? "approved" : "rejected";
      }
      // Also mark any un-reviewed IMAGE_REVIEW_PENDING products as rejected
      for (const p of selectedBatch.products) {
        if (p.status === "IMAGE_REVIEW_PENDING" && !(p.productId in decisions)) {
          decisions[p.productId] = "rejected";
        }
      }
      await reviewBatch(selectedBatch.batchId, decisions);

      // Start video pipeline for approved images
      const videoProducts = approved.map((p) => ({
        productName: p.productName,
        imgUrl: p.imgUrl,
        category: "",
        price: "",
        skipImageGeneration: true,
        existingImageUrl: p.generatedImageUrl!,
      }));

      await startPipeline(
        videoProducts,
        falApiKey,
        imagePrompt,
        videoPrompt,
        imageModel,
        videoModel,
        false
      );

      // Reset review state and refresh
      setReviewDecisions({});
      setSelectedBatch(null);
      await fetchBatches();
    } catch (err: any) {
      setReviewError(err.response?.data?.error || err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleRegenerateRejected = async () => {
    if (!selectedBatch || !falApiKey) return;

    const rejected = selectedBatch.products.filter(
      (p) => reviewDecisions[p.productId] === false
    );
    if (rejected.length === 0) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      // Mark rejected products in the original batch
      const decisions: Record<string, "approved" | "rejected"> = {};
      for (const [productId, isApproved] of Object.entries(reviewDecisions)) {
        decisions[productId] = isApproved ? "approved" : "rejected";
      }
      await reviewBatch(selectedBatch.batchId, decisions);

      // Start new image-only pipeline for rejected products
      const regenProducts = rejected.map((p) => ({
        productName: p.productName,
        imgUrl: p.imgUrl,
        category: "",
        price: "",
      }));

      await startPipeline(
        regenProducts,
        falApiKey,
        imagePrompt,
        videoPrompt,
        imageModel,
        videoModel,
        true // imageOnly
      );

      setReviewDecisions({});
      setSelectedBatch(null);
      await fetchBatches();
    } catch (err: any) {
      setReviewError(err.response?.data?.error || err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ---------- Batch Detail View ----------
  if (selectedBatch) {
    const isCancelled = selectedBatch.summary.status === "CANCELLED";
    const reviewCount = selectedBatch.statusCounts["IMAGE_REVIEW_PENDING"] || 0;
    const hasReviewItems = reviewCount > 0;
    const allDone = isCancelled || selectedBatch.products.every(
      (p) => p.status === "COMPLETED" || p.status === "FAILED" || p.status === "IMAGE_REVIEW_PENDING"
    );

    const approvedCount = Object.values(reviewDecisions).filter((v) => v === true).length;
    const rejectedCount = Object.values(reviewDecisions).filter((v) => v === false).length;

    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSelectedBatch(null); setReviewDecisions({}); setReviewError(null); }}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">Batch Detail</h1>
            <p className="text-[11px] text-dark-400 font-mono truncate">
              {selectedBatch.batchId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!allDone && (
              <>
                <span className="flex items-center gap-1.5 text-xs text-sky-400 mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-glow" />
                  Live
                </span>
                <button
                  onClick={handleCancel}
                  disabled={refreshing}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 hover:text-red-400 hover:border-red-400/30 transition-all"
                >
                  <X className="w-3 h-3" />
                  Cancel Job
                </button>
              </>
            )}
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="glass-card p-4 mb-4">
          <ProgressBar
            counts={selectedBatch.statusCounts}
            total={selectedBatch.products.length}
          />
        </div>

        {/* Image Review Banner + Actions */}
        {hasReviewItems && (
          <div className="space-y-3 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">
                    {reviewCount} image{reviewCount !== 1 ? "s" : ""} ready for review
                  </span>
                </div>
                <button
                  onClick={() => approveAll(selectedBatch.products)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Approve All
                </button>
              </div>

              {/* Review grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedBatch.products
                  .filter((p) => p.status === "IMAGE_REVIEW_PENDING")
                  .map((p) => {
                    const decision = reviewDecisions[p.productId];
                    return (
                      <div
                        key={p.productId}
                        className={`rounded-lg border transition-all ${
                          decision === true
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : decision === false
                            ? "border-red-500/40 bg-red-500/5 opacity-60"
                            : "border-dark-600 bg-dark-800"
                        }`}
                      >
                        <div className="aspect-square rounded-t-lg overflow-hidden bg-dark-700">
                          {p.generatedImageUrl ? (
                            <a href={p.generatedImageUrl} target="_blank" rel="noreferrer">
                              <img
                                src={p.generatedImageUrl}
                                alt={p.productName}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-dark-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] text-slate-300 truncate mb-2">{p.productName}</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => toggleReviewDecision(p.productId, true)}
                              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] transition-all ${
                                decision === true
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-dark-700 text-slate-500 hover:text-emerald-400"
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => toggleReviewDecision(p.productId, false)}
                              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] transition-all ${
                                decision === false
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-dark-700 text-slate-500 hover:text-red-400"
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {reviewError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-lg p-3 mt-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {reviewError}
                </div>
              )}

              {!falApiKey && (
                <div className="flex items-center gap-2 text-warning text-sm bg-warning/5 border border-warning/10 rounded-lg p-3 mt-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Set your fal.ai API key in Settings to continue.
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                {rejectedCount > 0 && (
                  <button
                    onClick={handleRegenerateRejected}
                    disabled={reviewSubmitting || !falApiKey}
                    className="btn-secondary flex items-center gap-2 flex-1 justify-center py-2.5 text-sm"
                  >
                    {reviewSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate Rejected ({rejectedCount})
                  </button>
                )}
                <button
                  onClick={handleGenerateVideos}
                  disabled={reviewSubmitting || approvedCount === 0 || !falApiKey}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center py-2.5 text-sm"
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Generate Videos ({approvedCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product table */}
        <div className="glass-card overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dark-800 z-10">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-3 w-12"></th>
                  <th className="p-3">Product</th>
                  <th className="p-3 w-24">Status</th>
                  <th className="p-3 w-16 text-center">Img</th>
                  <th className="p-3 w-16 text-center">Vid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {selectedBatch.products.map((p) => {
                  const info = getStatus(p.status);
                  return (
                    <tr key={p.productId} className="hover:bg-dark-700/40 transition-colors">
                      <td className="p-3">
                        {p.imgUrl ? (
                          <img
                            src={p.imgUrl}
                            alt=""
                            className="w-8 h-8 rounded-md object-cover bg-dark-700"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display = "none")
                            }
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-dark-700 flex items-center justify-center">
                            <ImageIcon className="w-3 h-3 text-dark-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-slate-300 text-sm truncate max-w-[280px]">
                          {p.productName}
                        </p>
                        {p.error && (
                          <p className="text-[11px] text-red-400 mt-0.5 truncate max-w-[280px]">
                            {p.error}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${info.cls}`}>{info.label}</span>
                      </td>
                      <td className="p-3 text-center">
                        {p.generatedImageUrl ? (
                          <a href={p.generatedImageUrl} target="_blank" rel="noreferrer">
                            <ImageIcon className="w-4 h-4 text-emerald-400 inline-block" />
                          </a>
                        ) : (
                          <ImageIcon className="w-4 h-4 text-dark-500 inline-block" />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {p.videoUrl ? (
                          <a href={p.videoUrl} target="_blank" rel="noreferrer">
                            <Video className="w-4 h-4 text-emerald-400 inline-block" />
                          </a>
                        ) : (
                          <Video className="w-4 h-4 text-dark-500 inline-block" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Batch List View ----------
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Track your pipeline batches</p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Analytics Summary */}
      {batches.length > 0 && (() => {
        const totalProducts = batches.reduce((sum, b) => sum + (b.totalProducts || 0), 0);
        const completedBatches = batches.filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED").length;
        const estimatedSpend = batches.reduce((sum, b) => {
          const batchImg = MODEL_PRICING[b.imageModel || imageModel]?.costPerUnit ?? 0;
          const batchVid = b.imageOnly ? 0 : (MODEL_PRICING[b.videoModel || videoModel]?.costPerUnit ?? 0);
          return sum + b.totalProducts * (batchImg + batchVid);
        }, 0);
        return (
          <div className="glass-card p-4 mb-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Batches</p>
              <p className="text-lg font-bold text-white mt-1">{batches.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Products</p>
              <p className="text-lg font-bold text-white mt-1">{totalProducts}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Completed</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{completedBatches}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Est. Spend</p>
              <p className="text-lg font-bold text-accent mt-1">${estimatedSpend.toFixed(2)}</p>
            </div>
          </div>
        );
      })()}

      {cancelSuccess && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 mb-4 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Batch cancelled successfully.
        </div>
      )}

      {loading ? (
        <div className="glass-card p-14 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card p-14 text-center">
          <Clock className="w-8 h-8 text-dark-400 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-400 mb-1">No batches yet</h2>
          <p className="text-xs text-slate-500">
            Upload a Kalodata XLSX to start generating videos
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {batches.map((b) => {
            const info = getStatus(b.status);
            return (
              <div
                key={b.batchId}
                className="glass-card w-full p-4 flex items-center justify-between group transition-all"
              >
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={() => fetchBatchDetail(b.batchId)}
                >
                  <span className="text-[11px] text-dark-400 font-mono shrink-0">
                    {b.batchId.slice(0, 8)}
                  </span>
                  <span className={`badge ${info.cls} shrink-0`}>{info.label}</span>
                  <span className="text-sm text-slate-400">
                    {b.totalProducts} product{b.totalProducts !== 1 ? "s" : ""}
                  </span>
                  {(() => {
                    const batchImgModel = b.imageModel || imageModel;
                    const batchVidModel = b.videoModel || videoModel;
                    const imgCost = MODEL_PRICING[batchImgModel]?.costPerUnit ?? 0;
                    const vidCost = b.imageOnly ? 0 : (MODEL_PRICING[batchVidModel]?.costPerUnit ?? 0);
                    const cost = b.totalProducts * (imgCost + vidCost);
                    return cost > 0 ? (
                      <span className="text-[11px] text-accent hidden sm:inline">
                        ~${cost.toFixed(2)}{b.imageOnly ? " (img)" : ""}
                      </span>
                    ) : null;
                  })()}
                  <span className="text-[11px] text-dark-400 hidden sm:inline">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                   <button
                    onClick={(e) => {
                       e.stopPropagation();
                       if (confirm("Are you sure you want to delete this batch? This cannot be undone.")) {
                           import("../lib/api").then(({ deleteBatch }) => {
                               deleteBatch(b.batchId).then(() => {
                                   fetchBatches();
                               }).catch(err => {
                                   console.error("Failed to delete", err);
                                   alert("Failed to delete batch");
                               });
                           });
                       }
                    }}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Job"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <ChevronRight
                    className="w-4 h-4 text-dark-400 group-hover:text-slate-400 transition-colors shrink-0 cursor-pointer"
                    onClick={() => fetchBatchDetail(b.batchId)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
