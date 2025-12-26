export interface Job {
  inputKey: string;
  outputKey: string;
}

export interface ProcessingResult {
  outputPath: string;
  outputFiles: string[];
}

export interface WebhookPayload {
  event: string;
  project_identifier: string;
  input_key: string;
  output_key: string;
  processed_bucket: string;
  timestamp: string;
  error?: string;
}

export type MediaType = "video" | "image" | "unknown";

export const WEBHOOK_EVENTS = {
  VIDEO_PROCESSED: "video.processed",
  IMAGE_PROCESSED: "image.processed",
  VIDEO_PROCESSING_FAILED: "video.processing.failed",
  IMAGE_PROCESSING_FAILED: "image.processing.failed",
  PROCESSING_FAILED: "processing.failed",
} as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
  "image/tif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/x-png",
  "image/apng",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/webm",
  "video/ogg",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
  "video/x-flv",
  "video/x-m4v",
  "video/mp2t",
  "video/x-ms-asf",
  "video/x-ms-wm",
  "video/x-ms-wmx",
  "video/x-ms-wvx",
  "video/avi",
] as const;

export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as readonly string[];
