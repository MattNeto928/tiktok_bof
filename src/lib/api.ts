import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getFalKey = () => localStorage.getItem("tiktok-bof-fal-key") || "";

const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = API_URL;
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

// Start pipeline with product data directly
export const startPipeline = (
  products: Array<{ productName: string; imgUrl: string; category: string; price: string }>,
  falApiKey: string,
  imagePrompt?: string,
  videoPrompt?: string,
  imageModel?: string,
  videoModel?: string
) =>
  api.post<{ batchId: string; totalProducts: number }>("/upload", {
    products,
    falApiKey,
    imagePrompt,
    videoPrompt,
    imageModel,
    videoModel,
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

// Cancel batch
export const cancelBatch = (batchId: string) =>
  api.post<{ message: string; stoppedCount: number }>(`/batches/${batchId}/cancel`);

export default api;
