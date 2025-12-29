import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { config } from "../config.js";

export class StorageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({});
  }

  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    const obj = await this.s3.send(
      new GetObjectCommand({
        Bucket: config.rawBucket,
        Key: s3Key,
      })
    );

    await this.streamToFile(obj.Body, localPath);
  }

  async uploadFile(
    localPath: string,
    s3Key: string,
    contentType?: string
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: config.processedBucket,
        Key: s3Key,
        Body: fs.createReadStream(localPath),
        ContentType: contentType || this.getContentType(localPath),
      })
    );
  }

  async uploadDirectory(
    dirPath: string,
    baseS3Key: string,
    contentTypeMap?: (filename: string) => string | undefined,
    rootDir: string = dirPath
  ): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.uploadDirectory(
          fullPath,
          baseS3Key,
          contentTypeMap,
          dirPath
        );
      } else {
        const relativePath = path
          .relative(rootDir, fullPath)
          .replace(/\\/g, "/");

        const s3Key = `${baseS3Key}/${relativePath}`;

        const contentType =
          contentTypeMap?.(entry.name) ?? this.getContentType(entry.name);

        await this.uploadFile(fullPath, s3Key, contentType);
      }
    }
  }

  private async streamToFile(body: any, filePath: string): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

    const write = fs.createWriteStream(filePath);
    const stream =
      body instanceof Readable
        ? body
        : Readable.fromWeb(body.transformToWebStream());

    await new Promise<void>((resolve, reject) =>
      stream.pipe(write).on("finish", resolve).on("error", reject)
    );
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const contentTypeMap: Record<string, string> = {
      ".m3u8": "application/vnd.apple.mpegurl",
      ".ts": "video/mp2t",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".svg": "image/svg+xml",
      ".tiff": "image/tiff",
      ".tif": "image/tiff",
      ".ico": "image/x-icon",
      ".avif": "image/avif",
      ".heic": "image/heic",
      ".heif": "image/heif",
    };

    return contentTypeMap[ext] || "application/octet-stream";
  }
}
