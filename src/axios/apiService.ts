import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";

// Base types
interface ApiParams extends AxiosRequestConfig {
  responseType?: "json" | "blob" | "arraybuffer" | "document" | "text";
}

// Create axios instance
const apiService = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth token
apiService.interceptors.request.use(
  (config) => {
    const token = Cookies.get("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// GET - Simplified version
export const getApi = async <T = unknown>(
  endpoint: string,
  config?: ApiParams
): Promise<T> => {
  const res = await apiService.get<T>(endpoint, config);
  return res.data;
};

// POST - Enhanced to handle both JSON and FormData
export const postApi = async <T = unknown, D = any>(
  endpoint: string,
  data: D,
  config?: ApiParams & { isFormData?: boolean }
): Promise<T> => {
  const headers = config?.isFormData
    ? { "Content-Type": "multipart/form-data" }
    : { "Content-Type": "application/json" };

  const res = await apiService.post<T>(endpoint, data, {
    ...config,
    headers: {
      ...headers,
      ...config?.headers,
    },
  });
  return res.data;
};

// PUT - Enhanced version with FormData support
export const putApi = async <T = unknown, D = any>(
  endpoint: string,
  data: D,
  config?: ApiParams & { isFormData?: boolean }
): Promise<T> => {
  const headers = config?.isFormData
    ? { "Content-Type": "multipart/form-data" }
    : { "Content-Type": "application/json" };

  const res = await apiService.put<T>(endpoint, data, {
    ...config,
    headers: {
      ...headers,
      ...config?.headers,
    },
  });
  return res.data;
};

// PATCH - Added for completeness
export const patchApi = async <T = unknown, D = any>(
  endpoint: string,
  data: D,
  config?: ApiParams & { isFormData?: boolean }
): Promise<T> => {
  const headers = config?.isFormData
    ? { "Content-Type": "multipart/form-data" }
    : { "Content-Type": "application/json" };

  const res = await apiService.patch<T>(endpoint, data, {
    ...config,
    headers: {
      ...headers,
      ...config?.headers,
    },
  });
  return res.data;
};

// DELETE - Simplified version
export const deleteApi = async <T = unknown>(
  endpoint: string,
  config?: ApiParams
): Promise<T> => {
  const res = await apiService.delete<T>(endpoint, config);
  return res.data;
};

// File upload helper
export const uploadFile = async <T = unknown>(
  endpoint: string,
  file: File,
  fieldName = "file",
  additionalData?: Record<string, unknown>,
  config?: ApiParams
): Promise<T> => {
  const formData = new FormData();
  formData.append(fieldName, file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value instanceof Blob ? value : String(value));
      }
    });
  }

  return postApi<T, FormData>(endpoint, formData, {
    ...config,
    isFormData: true,
  });
};