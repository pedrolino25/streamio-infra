import { ApiGatewayEvent, RequestBody, UploadData } from "../types";
import { ContentTypeValidator } from "./content-type-validator";
import { MultipartParser } from "./multipart-parser";

export class RequestValidator {
  static validateApiKey(apiKey: string | undefined): string | null {
    if (!apiKey) {
      return "Missing API key";
    }
    return null;
  }

  static validateRequestBody(
    body: any,
    allowedFileTypes: Set<string>
  ): RequestBody {
    if (!body || typeof body !== "object") {
      throw new Error("Invalid request body");
    }

    const { filename, path, contentType } = body;

    if (
      !filename ||
      typeof filename !== "string" ||
      filename.trim().length === 0
    ) {
      throw new Error("Filename is required and must be a non-empty string");
    }

    const normalizedPath = path && typeof path === "string" ? path : "";

    if (!contentType || typeof contentType !== "string") {
      throw new Error("Content-Type is required");
    }

    const normalizedContentType = ContentTypeValidator.normalize(contentType);
    if (!ContentTypeValidator.isValid(normalizedContentType, allowedFileTypes)) {
      throw new Error(
        `File type "${contentType}" is not allowed. Allowed types: images and videos (${allowedFileTypes.size} types supported)`
      );
    }

    return {
      filename: filename.trim(),
      path: normalizedPath.trim(),
      contentType: normalizedContentType,
    };
  }

  /**
   * Parses upload request from API Gateway event
   * Supports multipart/form-data with 'file' field and optional 'path' field
   */
  static async parseUploadRequest(
    event: ApiGatewayEvent,
    allowedFileTypes: Set<string>
  ): Promise<UploadData | null> {
    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];
    
    // Try multipart/form-data first
    if (contentType?.includes("multipart/form-data")) {
      const uploadData = await MultipartParser.parse(
        event.body as string,
        contentType,
        event.isBase64Encoded
      );

      if (uploadData) {
        // Validate content type
        const normalizedContentType = ContentTypeValidator.normalize(
          uploadData.contentType
        );
        if (
          !ContentTypeValidator.isValid(normalizedContentType, allowedFileTypes)
        ) {
          throw new Error(
            `File type "${uploadData.contentType}" is not allowed. Allowed types: images and videos (${allowedFileTypes.size} types supported)`
          );
        }

        return {
          ...uploadData,
          contentType: normalizedContentType,
        };
      }
    }

    // Try binary upload with Content-Type header and filename in headers
    if (contentType && event.body) {
      const filename =
        event.headers?.["x-filename"] ||
        event.headers?.["X-Filename"] ||
        event.headers?.["x-file-name"] ||
        event.headers?.["X-File-Name"];

      if (filename && typeof event.body === "string") {
        const normalizedContentType = ContentTypeValidator.normalize(contentType);
        if (
          !ContentTypeValidator.isValid(normalizedContentType, allowedFileTypes)
        ) {
          throw new Error(
            `File type "${contentType}" is not allowed. Allowed types: images and videos (${allowedFileTypes.size} types supported)`
          );
        }

        const fileBuffer = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "utf8");

        const path =
          event.headers?.["x-path"] || event.headers?.["X-Path"] || undefined;

        return {
          filename: filename.trim(),
          path,
          contentType: normalizedContentType,
          fileBuffer,
        };
      }
    }

    return null;
  }
}

