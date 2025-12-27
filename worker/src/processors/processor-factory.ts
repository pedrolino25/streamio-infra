import {
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "../config.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MediaType,
} from "../types.js";
import { IProcessor } from "./base-processor.js";
import { ImageProcessor } from "./image-processor.js";
import { VideoProcessor } from "./video-processor.js";

export class ProcessorFactory {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({});
  }

  async getProcessor(inputKey: string): Promise<IProcessor> {
    const contentType = await this.getContentType(inputKey);
    const mediaType = this.getMediaType(contentType);

    switch (mediaType) {
      case "video":
        return new VideoProcessor();
      case "image":
        return new ImageProcessor();
      default:
        throw new Error(
          `Unsupported content type: ${contentType}. Allowed types: videos and images.`
        );
    }
  }

  private async getContentType(inputKey: string): Promise<string> {
    try {
      // Use HeadObjectCommand instead of GetObjectCommand to avoid downloading the file
      // This only retrieves metadata, not the file body
      const obj = await this.s3.send(
        new HeadObjectCommand({
          Bucket: config.rawBucket,
          Key: inputKey,
        })
      );

      return obj.ContentType || "application/octet-stream";
    } catch (error) {
      console.error("Failed to get content type from S3:", error);
      return this.getContentTypeFromExtension(inputKey);
    }
  }

  private getContentTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop() || "";

    const extensionMap: Record<string, string> = {
      // Video
      mp4: "video/mp4",
      mpeg: "video/mpeg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      wmv: "video/x-ms-wmv",
      webm: "video/webm",
      ogv: "video/ogg",
      mkv: "video/x-matroska",
      "3gp": "video/3gpp",
      "3g2": "video/3gpp2",
      flv: "video/x-flv",
      m4v: "video/x-m4v",
      ts: "video/mp2t",
      asf: "video/x-ms-asf",
      // Image
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
      tiff: "image/tiff",
      tif: "image/tiff",
      ico: "image/x-icon",
      avif: "image/avif",
      heic: "image/heic",
      heif: "image/heif",
    };

    return extensionMap[ext] || "application/octet-stream";
  }

  private getMediaType(contentType: string): MediaType {
    const normalized = contentType.toLowerCase();

    if (ALLOWED_VIDEO_TYPES.includes(normalized as any)) {
      return "video";
    }

    if (ALLOWED_IMAGE_TYPES.includes(normalized as any)) {
      return "image";
    }

    return "unknown";
  }
}
