import { useState, useCallback, useRef } from "react";
import { useAppContext } from "../lib/store";
import {
  getUploadUrl,
  uploadXlsxToS3,
  startPipeline,
} from "../lib/api";
import {
  Upload,
  FileSpreadsheet,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
  Minus,
  Plus,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedProduct {
  productName: string;
  imgUrl: string;
  category: string;
  price: string;
}

export default function UploadPage() {
  const { falApiKey } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    batchId: string;
    totalProducts: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseXlsx = useCallback((f: File) => {
    setFile(f);
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
          }));

        setProducts(parsed);
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

  const handleStartPipeline = async () => {
    if (!file || !falApiKey) return;
    setIsUploading(true);
    setError(null);

    try {
      // Get presigned upload URL
      const { data: urlData } = await getUploadUrl();

      // Upload XLSX to S3
      await uploadXlsxToS3(urlData.uploadUrl, file);

      // Start pipeline with selected batch size
      const { data: pipelineData } = await startPipeline(
        urlData.s3Key,
        falApiKey,
        batchSize
      );

      setResult(pipelineData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setProducts([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
          <Upload className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload</h1>
          <p className="text-sm text-slate-400">
            Import Kalodata XLSX to start the video pipeline
          </p>
        </div>
      </div>

      {/* Success state */}
      {result && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Pipeline Started!
          </h2>
          <p className="text-slate-400 mb-1">
            Batch ID: <code className="text-indigo-400">{result.batchId}</code>
          </p>
          <p className="text-slate-400 mb-6">
            Processing {result.totalProducts} products
          </p>
          <button onClick={resetUpload} className="btn-secondary">
            Upload Another
          </button>
        </div>
      )}

      {/* Upload / Preview state */}
      {!result && (
        <>
          {/* Dropzone */}
          {products.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-card p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
                  : "hover:border-indigo-500/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
                <FileSpreadsheet className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                Drop your Kalodata XLSX here
              </h2>
              <p className="text-sm text-slate-400">
                or click to browse. Supports .xlsx files from Kalodata export.
              </p>
            </div>
          )}

          {/* Parsed products preview */}
          {products.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-semibold">{file?.name}</span>
                  <span className="badge badge-completed">
                    {products.length} products
                  </span>
                </div>
                <button
                  onClick={resetUpload}
                  className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-dark-800 z-10">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="p-3 w-12">#</th>
                        <th className="p-3 w-14">Image</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 w-24">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600">
                      {products.map((p, i) => (
                        <tr
                          key={i}
                          className="hover:bg-dark-700/50 transition-colors"
                        >
                          <td className="p-3 text-slate-500">{i + 1}</td>
                          <td className="p-3">
                            {p.imgUrl ? (
                              <img
                                src={p.imgUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-dark-600"
                                onError={(e) =>
                                  ((e.target as HTMLImageElement).style.display =
                                    "none")
                                }
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-300 font-medium">
                            {p.productName}
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {p.category}
                          </td>
                          <td className="p-3 text-slate-300">
                            {p.price ? `$${p.price}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batch Size Selector */}
              <div className="glass-card p-4">
                <label className="text-sm font-semibold text-slate-300 mb-3 block">
                  Products to process
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                    className="w-9 h-9 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4 text-slate-300" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={products.length}
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(
                        Math.max(1, Math.min(products.length, Number(e.target.value) || 1))
                      )
                    }
                    className="input-field w-20 text-center text-lg font-bold"
                  />
                  <button
                    onClick={() => setBatchSize(Math.min(products.length, batchSize + 1))}
                    className="w-9 h-9 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4 text-slate-300" />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={products.length}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    of {products.length}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* API key warning */}
              {!falApiKey && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Set your fal.ai API key in Settings before starting the
                  pipeline.
                </div>
              )}

              <button
                onClick={handleStartPipeline}
                disabled={isUploading || !falApiKey}
                className="btn-primary flex items-center gap-2 w-full justify-center py-3 text-base"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Pipeline ({batchSize} product{batchSize !== 1 ? "s" : ""})
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
