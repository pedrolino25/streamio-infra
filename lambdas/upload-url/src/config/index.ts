const ALLOWED_IMAGE_TYPES = [
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
];

const ALLOWED_VIDEO_TYPES = [
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
];

export class Config {
  readonly rawBucket: string;
  readonly projectsTable: string;
  readonly uploadUrlExpiresIn: number;
  readonly allowedFileTypes: Set<string>;

  constructor() {
    this.rawBucket = this.getRequiredEnv("RAW_BUCKET");
    this.projectsTable = this.getRequiredEnv("PROJECTS_TABLE");
    this.uploadUrlExpiresIn = 300;
    this.allowedFileTypes = new Set([
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
    ]);
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
}

