import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3PresignerService {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly expiresIn: number
  ) {}

  async generatePresignedUrl(
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3, command, {
        expiresIn: this.expiresIn,
      });
    } catch (error) {
      throw new Error(
        `Failed to generate presigned URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

