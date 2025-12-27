import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Config } from "../config";
import { ProjectService } from "../services/project.service";
import { ApiGatewayEvent, ApiGatewayResponse } from "../types";
import { ContentTypeValidator } from "../utils/content-type-validator";
import { ResponseBuilder } from "../utils/response-builder";
import { S3KeyBuilder } from "../utils/s3-key-builder";

export class UploadHandler {
  private readonly config: Config;
  private readonly projectService: ProjectService;
  private readonly s3: S3Client;

  constructor() {
    this.config = new Config();
    this.projectService = new ProjectService(
      new DynamoDBClient({}),
      this.config.projectsTable
    );
    this.s3 = new S3Client({});
  }

  async handle(event: ApiGatewayEvent): Promise<ApiGatewayResponse> {
    if (event.httpMethod === "OPTIONS") {
      return ResponseBuilder.options();
    }

    try {
      const apiKey = this.getHeader(event, "x-api-key", "X-Api-Key");
      if (!apiKey) {
        return ResponseBuilder.error(401, "Missing API key");
      }

      const project = await this.projectService.getProject(apiKey);
      if (!project) {
        return ResponseBuilder.error(403, "Invalid API key");
      }

      // Parse request body
      let requestBody;
      try {
        const body =
          typeof event.body === "string" ? JSON.parse(event.body) : event.body;

        if (!body || typeof body !== "object") {
          throw new Error("Invalid request body");
        }

        const { filename, path, contentType } = body;

        if (
          !filename ||
          typeof filename !== "string" ||
          filename.trim().length === 0
        ) {
          throw new Error(
            "Filename is required and must be a non-empty string"
          );
        }

        if (!contentType || typeof contentType !== "string") {
          throw new Error("Content-Type is required");
        }

        const normalizedContentType =
          ContentTypeValidator.normalize(contentType);
        if (
          !ContentTypeValidator.isValid(
            normalizedContentType,
            this.config.allowedFileTypes
          )
        ) {
          throw new Error(
            `File type "${contentType}" is not allowed. Allowed types: images and videos`
          );
        }

        requestBody = {
          filename: filename.trim(),
          path: (path && typeof path === "string" ? path : "").trim(),
          contentType: normalizedContentType,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid request body";
        return ResponseBuilder.error(400, message);
      }

      const s3Key = S3KeyBuilder.build(
        project.projectName!,
        requestBody.path,
        requestBody.filename
      );

      // Generate presigned URL for direct S3 upload
      const command = new PutObjectCommand({
        Bucket: this.config.rawBucket,
        Key: s3Key,
        ContentType: requestBody.contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 3600, // 1 hour
      });

      return ResponseBuilder.success({
        uploadUrl,
        s3Key,
        expiresIn: 3600,
      });
    } catch (error) {
      console.error("Presigned URL generation error:", error);
      return ResponseBuilder.error(
        500,
        error instanceof Error ? error.message : "Internal server error"
      );
    }
  }

  private getHeader(
    event: ApiGatewayEvent,
    ...keys: string[]
  ): string | undefined {
    const headers = event.headers || {};
    for (const key of keys) {
      const value = headers[key];
      if (value) return value;
    }
    return undefined;
  }
}
