import { useState, useEffect } from "react";
import { listBatches, getBatchDetail, type Batch, type BatchDetail } from "../lib/api";
import {
  LayoutDashboard,
  RefreshCw,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Clock,

  Image as ImageIcon,
  Video,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  PENDING: { label: "Pending", class: "badge-pending" },
  IMAGE_GENERATING: { label: "Generating Image", class: "badge-processing" },
  IMAGE_GENERATED: { label: "Image Ready", class: "badge-processing" },
  VIDEO_GENERATING: { label: "Generating Video", class: "badge-processing" },
  COMPLETED: { label: "Completed", class: "badge-completed" },
  FAILED: { label: "Failed", class: "badge-failed" },
  PROCESSING: { label: "Processing", class: "badge-processing" },
};

function getStatusInfo(status: string) {
  return STATUS_LABELS[status] || { label: status, class: "badge-pending" };
}

function ProgressBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const completed = counts["COMPLETED"] || 0;
  const failed = counts["FAILED"] || 0;
  const processing =
    (counts["IMAGE_GENERATING"] || 0) +
    (counts["IMAGE_GENERATED"] || 0) +
    (counts["VIDEO_GENERATING"] || 0);
  const pending = total - completed - failed - processing;

  return (
    <div className="space-y-2">
      <div className="h-2 rounded-full bg-dark-600 overflow-hidden flex">
        {completed > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        )}
        {processing > 0 && (
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${(processing / total) * 100}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        {completed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {completed} done
          </span>
        )}
        {processing > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            {processing} processing
          </span>
        )}
        {pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
            {pending} pending
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {failed} failed
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBatches = async () => {
    try {
      const { data } = await listBatches();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetail = async (batchId: string) => {
    try {
      const { data } = await getBatchDetail(batchId);
      setSelectedBatch(data);
    } catch (err) {
      console.error("Failed to fetch batch detail:", err);
    }
  };

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    const interval = setInterval(() => fetchBatchDetail(selectedBatch.batchId), 5000);
    return () => clearInterval(interval);
  }, [selectedBatch?.batchId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedBatch) {
      await fetchBatchDetail(selectedBatch.batchId);
    } else {
      await fetchBatches();
    }
    setRefreshing(false);
  };

  // Batch detail view
  if (selectedBatch) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedBatch(null)}
            className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Batch Detail</h1>
            <p className="text-xs text-slate-500 font-mono">{selectedBatch.batchId}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="glass-card p-4 mb-4">
          <ProgressBar
            counts={selectedBatch.statusCounts}
            total={selectedBatch.products.length}
          />
        </div>

        <div className="glass-card overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dark-800 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-3">Product</th>
                  <th className="p-3 w-36">Status</th>
                  <th className="p-3 w-20">Image</th>
                  <th className="p-3 w-20">Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {selectedBatch.products.map((p) => {
                  const info = getStatusInfo(p.status);
                  return (
                    <tr key={p.productId} className="hover:bg-dark-700/50 transition-colors">
                      <td className="p-3">
                        <p className="text-slate-300 font-medium text-sm">{p.productName}</p>
                        {p.error && (
                          <p className="text-xs text-red-400 mt-1">{p.error}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${info.class}`}>{info.label}</span>
                      </td>
                      <td className="p-3">
                        {p.generatedImageUrl ? (
                          <a href={p.generatedImageUrl} target="_blank" rel="noreferrer">
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                          </a>
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </td>
                      <td className="p-3">
                        {p.videoUrl ? (
                          <a href={p.videoUrl} target="_blank" rel="noreferrer">
                            <Video className="w-4 h-4 text-emerald-400" />
                          </a>
                        ) : (
                          <Video className="w-4 h-4 text-slate-600" />
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

  // Batch list view
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <LayoutDashboard className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400">Track your pipeline batches</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-300 mb-1">No batches yet</h2>
          <p className="text-sm text-slate-500">
            Upload a Kalodata XLSX to start generating videos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <button
              key={b.batchId}
              onClick={() => fetchBatchDetail(b.batchId)}
              className="glass-card w-full p-4 text-left hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-1">
                    {b.batchId.slice(0, 8)}...
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getStatusInfo(b.status).class}`}>
                      {getStatusInfo(b.status).label}
                    </span>
                    <span className="text-sm text-slate-400">
                      {b.totalProducts} products
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
