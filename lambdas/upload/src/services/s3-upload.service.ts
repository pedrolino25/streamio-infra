import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export class S3UploadService {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string
  ) {}

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.s3.send(command);
    } catch (error) {
      throw new Error(
        `Failed to upload file to S3: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

