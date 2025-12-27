import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Config } from "../config";
import { ProjectService } from "../services/project.service";
import { S3UploadService } from "../services/s3-upload.service";
import { ApiGatewayEvent, ApiGatewayResponse } from "../types";
import { RequestValidator } from "../utils/request-validator";
import { ResponseBuilder } from "../utils/response-builder";
import { S3KeyBuilder } from "../utils/s3-key-builder";

export class UploadHandler {
  private readonly config: Config;
  private readonly projectService: ProjectService;
  private readonly s3UploadService: S3UploadService;

  constructor() {
    this.config = new Config();
    this.projectService = new ProjectService(
      new DynamoDBClient({}),
      this.config.projectsTable
    );
    this.s3UploadService = new S3UploadService(
      new S3Client({}),
      this.config.rawBucket
    );
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

      const uploadData = await RequestValidator.parseUploadRequest(
        event,
        this.config.allowedFileTypes
      );
      if (!uploadData) {
        return ResponseBuilder.error(
          400,
          "Invalid request. Expected multipart/form-data with 'file' field or binary data with X-Filename header."
        );
      }

      const s3Key = S3KeyBuilder.build(
        project.projectName!,
        uploadData.path || "",
        uploadData.filename
      );

      await this.s3UploadService.uploadFile(
        s3Key,
        uploadData.fileBuffer,
        uploadData.contentType
      );

      return ResponseBuilder.success({
        s3Key,
        message: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
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
