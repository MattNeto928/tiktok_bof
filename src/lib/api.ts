import axios from "axios";

const getApiUrl = () =>
  localStorage.getItem("tiktok-bof-api-url") || "http://localhost:3001";

const getFalKey = () => localStorage.getItem("tiktok-bof-fal-key") || "";

const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  config.headers["X-Fal-Key"] = getFalKey();
  return config;
});

export interface Batch {
  batchId: string;
  productId: string;
  itemType: string;
  totalProducts: number;
  status: string;
  createdAt: string;
}

export interface Product {
  batchId: string;
  productId: string;
  productName: string;
  imgUrl: string;
  category: string;
  price: string;
  status: string;
  generatedImageUrl?: string;
  videoS3Key?: string;
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BatchDetail {
  batchId: string;
  summary: Batch;
  products: Product[];
  statusCounts: Record<string, number>;
}

// Upload URL
export const getUploadUrl = () =>
  api.post<{ uploadUrl: string; s3Key: string }>("/upload-url");

// Upload XLSX to presigned URL
export const uploadXlsxToS3 = (url: string, file: File) =>
  axios.put(url, file, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });

// Start pipeline
export const startPipeline = (s3Key: string, falApiKey: string, limit?: number) =>
  api.post<{ batchId: string; totalProducts: number }>("/upload", {
    s3Key,
    falApiKey,
    limit,
  });

// List batches
export const listBatches = () =>
  api.get<{ batches: Batch[] }>("/batches");

// Get batch detail
export const getBatchDetail = (batchId: string) =>
  api.get<BatchDetail>(`/batches/${batchId}`);

// Get single video download URL
export const getVideoDownloadUrl = (batchId: string, productId: string) =>
  api.get<{ downloadUrl: string }>(
    `/videos/${batchId}/${productId}/download`
  );

// Get multiple download URLs
export const getDownloadUrls = (
  items: Array<{ batchId: string; productId: string }>
) =>
  api.post<{
    urls: Array<{
      batchId: string;
      productId: string;
      downloadUrl: string;
      s3Key: string;
    }>;
  }>("/videos/download-urls", { items });

export default api;
