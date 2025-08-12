import axios, { AxiosProgressEvent } from "axios";
import { CloudinaryResponse } from "./types";

// Create Cloudinary API instance
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}`,
  withCredentials: false, // Important for CORS
});

/**
 * Uploads a file directly to Cloudinary
 * @param file The file to upload
 * @param type File type ('image' or 'video')
 * @param onProgress Progress callback function
 * @returns Promise with Cloudinary response
 */
// In your cloudinaryService.ts
export const uploadToCloudinary = async (
  file: File,
  type: 'image' | 'video' | 'file' = 'file', 
  onProgress?: (percentage: number) => void
): Promise<CloudinaryResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
  formData.append('folder', 'chat_uploads');
  
  // Set resource_type based on file type
  const resourceType = type === 'video' ? 'video' : 'auto';

  try {
    const response = await cloudinaryApi.post<CloudinaryResponse>(
      `/${resourceType}/upload`,
      formData,
      {
        onUploadProgress: onProgress ? (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          onProgress(percentCompleted);
        } : undefined,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data.secure_url) {
      throw new Error('Upload failed - no URL returned from Cloudinary');
    }

    return response.data;
  } catch (error) {
    let errorMessage = 'Failed to upload to Cloudinary';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Uploads a file through your backend
 * @param file The file to upload
 * @param type File type ('image' or 'video')
 * @param onProgress Progress callback function
 * @returns Promise with Cloudinary response
 */
export const uploadThroughBackend = async (
  file: File,
  type: 'image' | 'video' | 'file', // Add 'file' to the type union
  onProgress?: (percentage: number) => void
): Promise<CloudinaryResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    const response = await axios.post<CloudinaryResponse>(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onProgress ? (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          onProgress(percentCompleted);
        } : undefined
      }
    );

    if (!response.data.secure_url) {
      throw new Error('Upload failed - no URL returned from backend');
    }

    return response.data;
  } catch (error) {
    let errorMessage = 'Failed to upload through backend';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    throw new Error(errorMessage);
  }
};

export default {
  uploadToCloudinary,
  uploadThroughBackend
};