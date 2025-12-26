import { S3EventRecord } from "../types";

export class S3KeyExtractor {
  static extract(record: S3EventRecord): string {
    if (!record.s3?.object?.key) {
      throw new Error("Missing S3 object key in event record");
    }

    try {
      return decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    } catch (error) {
      throw new Error(
        `Failed to decode S3 key: ${record.s3.object.key} - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

