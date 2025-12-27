import { ApiGatewayEvent, UploadData } from "../types";
import { ContentTypeValidator } from "./content-type-validator";
import { MultipartParser } from "./multipart-parser";

const getHeader = (
  headers: Record<string, string> | undefined,
  ...keys: string[]
): string | undefined => {
  if (!headers) return undefined;
  for (const key of keys) {
    const value = headers[key];
    if (value) return value;
  }
  return undefined;
};

const validateContentType = (
  contentType: string,
  allowedTypes: Set<string>
): string => {
  const normalized = ContentTypeValidator.normalize(contentType);
  if (!ContentTypeValidator.isValid(normalized, allowedTypes)) {
    throw new Error(
      `File type "${contentType}" is not allowed. Allowed types: images and videos (${allowedTypes.size} types supported)`
    );
  }
  return normalized;
};

export class RequestValidator {
  static async parseUploadRequest(
    event: ApiGatewayEvent,
    allowedFileTypes: Set<string>
  ): Promise<UploadData | null> {
    const contentType = getHeader(
      event.headers,
      "content-type",
      "Content-Type"
    );
    const headers = event.headers || {};

    // Try multipart/form-data first
    if (contentType?.includes("multipart/form-data")) {
      const uploadData = await MultipartParser.parse(
        event.body as string,
        contentType,
        event.isBase64Encoded
      );

      if (uploadData) {
        return {
          ...uploadData,
          contentType: validateContentType(
            uploadData.contentType,
            allowedFileTypes
          ),
        };
      }
    }

    // Try binary upload with headers
    if (contentType && event.body && typeof event.body === "string") {
      const filename = getHeader(
        headers,
        "x-filename",
        "X-Filename",
        "x-file-name",
        "X-File-Name"
      );

      if (filename) {
        const fileBuffer = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "utf8");

        return {
          filename: filename.trim(),
          path: getHeader(headers, "x-path", "X-Path"),
          contentType: validateContentType(contentType, allowedFileTypes),
          fileBuffer,
        };
      }
    }

    return null;
  }
}
