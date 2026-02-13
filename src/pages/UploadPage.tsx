import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext, MODEL_PRICING } from "../lib/store";
import { startPipeline } from "../lib/api";
import {
  FileSpreadsheet,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Clock,
  Trash2,
  Copy,
  Check,
  Eye,
  DollarSign,
  ArrowRight,
  Link,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedProduct {
  productName: string;
  imgUrl: string;
  category: string;
  price: string;
  tiktokUrl: string;
}

interface SavedUpload {
  id: string;
  fileName: string;
  productCount: number;
  uploadedAt: string;
  products: ParsedProduct[];
}

const UPLOADS_KEY = "tiktok-bof-uploads";

function loadSavedUploads(): SavedUpload[] {
  try {
    return JSON.parse(localStorage.getItem(UPLOADS_KEY) || "[]");
  } catch {
    return [];
  }
}

function removeSavedUpload(id: string) {
  const existing = loadSavedUploads();
  localStorage.setItem(UPLOADS_KEY, JSON.stringify(existing.filter((u) => u.id !== id)));
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { falApiKey, imagePrompt, videoPrompt, imageModel, videoModel, imageReviewMode } = useAppContext();
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    batchId: string;
    totalProducts: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedUploads, setSavedUploads] = useState<SavedUpload[]>(loadSavedUploads());
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState(false);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedUploads(loadSavedUploads());
  }, []);

  const loadProducts = (parsed: ParsedProduct[], fileName: string, uploadId?: string) => {
    setProducts(parsed);
    setSelectedProducts(new Set());
    setError(null);
    setResult(null);
    setActiveFileName(fileName);

    const id = uploadId || crypto.randomUUID();
    setActiveUploadId(id);

    const upload: SavedUpload = {
      id,
      fileName,
      productCount: parsed.length,
      uploadedAt: new Date().toISOString(),
      products: parsed,
    };

    const existing = loadSavedUploads();
    const isUpdate = existing.some(u => u.id === id);
    const updatedList = isUpdate
      ? existing.map(u => u.id === id ? upload : u)
      : [upload, ...existing].slice(0, 10);

    localStorage.setItem(UPLOADS_KEY, JSON.stringify(updatedList));
    setSavedUploads(updatedList);
  };

  const parseXlsx = useCallback((f: File) => {
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        const parsed = rows
          .filter((r) => r["img_url"] && r["Product Name"])
          .map((r) => ({
            productName: String(r["Product Name"]),
            imgUrl: String(r["img_url"]),
            category: String(r["Category"] || ""),
            price: String(r["Price($)"] || r["Avg. Unit Price($)"] || ""),
            tiktokUrl: String(r["TikTokUrl"] || r["tiktokUrl"] || r["tiktok_url"] || ""),
          }));

        loadProducts(parsed, f.name);
      } catch (err: any) {
        setError(`Failed to parse XLSX: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".xlsx")) {
        parseXlsx(f);
      } else {
        setError("Please upload an .xlsx file");
      }
    },
    [parseXlsx]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseXlsx(f);
  };

  const loadFromSaved = (upload: SavedUpload) => {
    loadProducts(upload.products, upload.fileName, upload.id);
  };

  const deleteSavedUpload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSavedUpload(id);
    setSavedUploads(loadSavedUploads());
    if (activeUploadId === id) {
      resetUpload();
    }
  };

  const toggleProduct = (idx: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((_, i) => i)));
    }
  };

  const handleCopyTikTokLinks = async () => {
    const links = products
      .filter((p) => p.tiktokUrl && p.tiktokUrl !== "undefined")
      .map((p) => p.tiktokUrl);
    if (links.length === 0) return;
    await navigator.clipboard.writeText(links.join("\n"));
    setCopiedLinks(true);
    setTimeout(() => setCopiedLinks(false), 2000);
  };

  const handleStartPipeline = async () => {
    if (selectedProducts.size === 0 || !falApiKey) return;
    setIsUploading(true);
    setError(null);

    try {
      const selectedData = Array.from(selectedProducts).map((i) => products[i]);
      const { data: pipelineData } = await startPipeline(
        selectedData,
        falApiKey,
        imagePrompt,
        videoPrompt,
        imageModel,
        videoModel,
        imageReviewMode
      );
      setResult(pipelineData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setProducts([]);
    setSelectedProducts(new Set());
    setResult(null);
    setError(null);
    setActiveUploadId(null);
    setActiveFileName(null);
  };

  // Pricing calculations
  const imgPrice = MODEL_PRICING[imageModel];
  const vidPrice = MODEL_PRICING[videoModel];
  const selectedCount = selectedProducts.size;
  const imgCost = imgPrice ? selectedCount * imgPrice.costPerUnit : 0;
  const vidCost = vidPrice ? selectedCount * vidPrice.costPerUnit : 0;
  const totalCost = imgCost + vidCost;

  const tiktokLinks = products.filter((p) => p.tiktokUrl && p.tiktokUrl !== "undefined");

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Upload</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import Kalodata XLSX to start the video pipeline
        </p>
      </div>

      {/* Success state */}
      {result && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            {imageReviewMode ? "Image Generation Started" : "Pipeline Started"}
          </h2>
          <p className="text-slate-500 text-sm mb-1">
            Batch <code className="text-accent text-xs font-mono">{result.batchId.slice(0, 8)}...</code>
          </p>
          <p className="text-slate-400 text-sm mb-6">
            {imageReviewMode
              ? `Generating images for ${result.totalProducts} product${result.totalProducts !== 1 ? "s" : ""} — review them on the Dashboard when ready`
              : `Processing ${result.totalProducts} product${result.totalProducts !== 1 ? "s" : ""}`
            }
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary flex items-center gap-2"
            >
              View in Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={resetUpload} className="btn-secondary">
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Upload / Preview */}
      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: previous uploads */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Recent Uploads
            </h2>
            {savedUploads.length === 0 ? (
              <div className="glass-card p-4 text-center">
                <Clock className="w-5 h-5 text-dark-400 mx-auto mb-2" />
                <p className="text-xs text-dark-400">No previous uploads</p>
              </div>
            ) : (
              savedUploads.map((u) => (
                <button
                  key={u.id}
                  onClick={() => loadFromSaved(u)}
                  className={`glass-card w-full p-3 text-left transition-all group ${
                    activeUploadId === u.id ? "border-accent/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {u.fileName}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-1">
                        {u.productCount} products · {new Date(u.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteSavedUpload(u.id, e)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-dark-600 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3 text-dark-400" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right panel: main content */}
          <div className="lg:col-span-3">
            {products.length === 0 && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`glass-card p-14 text-center cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? "border-accent bg-accent/5 scale-[1.005]"
                    : ""
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center mx-auto mb-5">
                  <FileSpreadsheet className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-300 mb-2">
                  Drop your Kalodata XLSX here
                </h2>
                <p className="text-sm text-slate-500">
                  or click to browse
                </p>
              </div>
            )}

            {products.length > 0 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-accent" />
                    <span className="text-white font-medium text-sm">
                      {activeFileName}
                    </span>
                    <span className="badge badge-completed">{products.length} products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Copy TikTok Links button */}
                    {tiktokLinks.length > 0 && (
                      <button
                        onClick={handleCopyTikTokLinks}
                        className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                      >
                        {copiedLinks ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy TikTok Links ({tiktokLinks.length})
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={resetUpload}
                      className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Product selection table */}
                <div className="glass-card overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-dark-700">
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      {selectedProducts.size === products.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      {selectedProducts.size === products.length ? "Deselect All" : "Select All"}
                    </button>
                    <span className="text-xs text-slate-500">
                      {selectedProducts.size} of {products.length} selected
                    </span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-dark-800 z-10">
                        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="p-3 w-10"></th>
                          <th className="p-3 w-12"></th>
                          <th className="p-3">Name</th>
                          <th className="p-3 w-32">Category</th>
                          <th className="p-3 w-20">Price</th>
                          {tiktokLinks.length > 0 && <th className="p-3 w-12 text-center">Link</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {products.map((p, i) => {
                          const isSelected = selectedProducts.has(i);
                          return (
                            <tr
                              key={i}
                              onClick={() => toggleProduct(i)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-accent/5 hover:bg-accent/10"
                                  : "hover:bg-dark-700/50"
                              }`}
                            >
                              <td className="p-3">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-accent" />
                                ) : (
                                  <Square className="w-4 h-4 text-dark-400" />
                                )}
                              </td>
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
                              <td className="p-3 text-slate-300 text-sm">{p.productName}</td>
                              <td className="p-3 text-slate-500 text-xs">{p.category}</td>
                              <td className="p-3 text-slate-300 text-sm">
                                {p.price ? `$${p.price}` : "\u2014"}
                              </td>
                              {tiktokLinks.length > 0 && (
                                <td className="p-3 text-center">
                                  {p.tiktokUrl && p.tiktokUrl !== "undefined" ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(p.tiktokUrl);
                                        setCopiedRow(i);
                                        setTimeout(() => setCopiedRow(null), 1500);
                                      }}
                                      className="p-1 rounded hover:bg-dark-600 transition-colors"
                                      title={p.tiktokUrl}
                                    >
                                      {copiedRow === i ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Link className="w-3.5 h-3.5 text-slate-500 hover:text-accent" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-dark-500">{"\u2014"}</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pricing Estimation */}
                {selectedCount > 0 && (imgPrice || vidPrice) && (
                  <div className="glass-card p-3 flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-accent shrink-0" />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>Estimated cost:</span>
                      {imgPrice && (
                        <span>
                          {selectedCount} img × ${imgPrice.costPerUnit.toFixed(3)} = ${imgCost.toFixed(2)}
                        </span>
                      )}
                      {imgPrice && vidPrice && !imageReviewMode && <span className="text-dark-500">+</span>}
                      {vidPrice && !imageReviewMode && (
                        <span>
                          {selectedCount} vid × ${vidPrice.costPerUnit.toFixed(2)} = ${vidCost.toFixed(2)}
                        </span>
                      )}
                      <span className="text-accent font-semibold">
                        = ${imageReviewMode ? imgCost.toFixed(2) : totalCost.toFixed(2)}
                      </span>
                      {imageReviewMode && (
                        <span className="text-sky-400 text-[11px]">(images only — video cost after review)</span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {!falApiKey && (
                  <div className="flex items-center gap-2 text-warning text-sm bg-warning/5 border border-warning/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Set your fal.ai API key in Settings first.
                  </div>
                )}

                {/* Image review mode indicator */}
                {imageReviewMode && (
                  <div className="flex items-center gap-2 text-sky-400 text-xs bg-sky-500/5 border border-sky-500/10 rounded-lg p-3">
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    Image review mode is ON — images will be generated first for your review on the Dashboard.
                  </div>
                )}

                <button
                  onClick={handleStartPipeline}
                  disabled={isUploading || !falApiKey || selectedProducts.size === 0}
                  className="btn-primary flex items-center gap-2 w-full justify-center py-3 text-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting Pipeline...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {selectedProducts.size === 0
                        ? "Select products to start"
                        : imageReviewMode
                        ? `Generate Images for Review (${selectedProducts.size} product${selectedProducts.size !== 1 ? "s" : ""})`
                        : `Start Pipeline (${selectedProducts.size} product${selectedProducts.size !== 1 ? "s" : ""})`
                      }
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
