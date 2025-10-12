import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

export type MediaType = 'image' | 'document' | 'video' | 'audio';

export interface MediaFile {
  uri: string;
  type: MediaType;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export const requestCameraPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera permissions to take photos!');
    return false;
  }
  return true;
};

export const requestMediaLibraryPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need photo library permissions to select images!');
    return false;
  }
  return true;
};

export const pickImageFromCamera = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
      alert(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return null;
    }

    return {
      uri: asset.uri,
      type: 'image',
      filename: asset.fileName || `photo_${Date.now()}.jpg`,
      size: asset.fileSize || 0,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.error('Error picking image from camera:', error);
    alert('Failed to take photo. Please try again.');
    return null;
  }
};

export const pickImageFromGallery = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
      alert(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return null;
    }

    return {
      uri: asset.uri,
      type: 'image',
      filename: asset.fileName || `image_${Date.now()}.jpg`,
      size: asset.fileSize || 0,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    alert('Failed to select image. Please try again.');
    return null;
  }
};

export const pickDocument = async (): Promise<MediaFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_DOCUMENT_TYPES,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    
    if (asset.size && asset.size > MAX_FILE_SIZE) {
      alert(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return null;
    }

    if (asset.mimeType && !ALLOWED_DOCUMENT_TYPES.includes(asset.mimeType)) {
      alert('This file type is not supported. Please select a PDF, Word, Excel, or text file.');
      return null;
    }

    return {
      uri: asset.uri,
      type: 'document',
      filename: asset.name,
      size: asset.size || 0,
      mimeType: asset.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error picking document:', error);
    alert('Failed to select document. Please try again.');
    return null;
  }
};

export const uploadMediaToStorage = async (
  file: MediaFile,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; error: null } | { url: null; error: string }> => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.filename.split('.').pop() || 'bin';
    const storagePath = `${userId}/${timestamp}_${file.filename}`;

    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    let fileData: ArrayBuffer | Blob;

    if (file.uri.startsWith('blob:') || file.uri.startsWith('http')) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      if (typeof blob.arrayBuffer === 'function') {
        fileData = await blob.arrayBuffer();
      } else {
        fileData = blob;
      }
    } else {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, fileData, {
        contentType: file.mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(storagePath);

    if (!urlData || !urlData.publicUrl) {
      console.error('URL generation error: No URL returned');
      return { url: null, error: 'Failed to generate file URL' };
    }

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Upload failed:', error);
    return { url: null, error: error.message || 'Upload failed' };
  }
};

export const deleteMediaFromStorage = async (mediaUrl: string): Promise<boolean> => {
  try {
    const url = new URL(mediaUrl);
    const pathParts = url.pathname.split('/chat-media/');
    if (pathParts.length < 2) return false;
    
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from('chat-media')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete media:', error);
    return false;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'picture-as-pdf';
  if (mimeType.includes('word')) return 'description';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table-chart';
  if (mimeType.includes('text')) return 'text-snippet';
  return 'insert-drive-file';
};
