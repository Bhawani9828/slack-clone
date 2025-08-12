export interface ApiResponse<T = unknown> {
  categories: any;
  data: T;
  status?: number;
  message?: string;
}

// Avoid `any` here by using `unknown`
export type ApiParams = Record<string, string | number | boolean | undefined>;


// export interface ApiParams {
//   params?: Record<string, string | number | boolean | undefined>;
//   headers?: Record<string, string>;
//   responseType?: "json" | "blob";
// }
export interface CategoryResponse {
  categories: any[]
  data: any
  status: number
  message?: string
}

export interface CloudinaryResponse {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
  // Add other fields you need
}