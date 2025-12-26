import { RequestBody } from "../types";
import { ContentTypeValidator } from "./content-type-validator";

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
}

