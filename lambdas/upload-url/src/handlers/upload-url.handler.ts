import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Config } from "../config";
import { ProjectService } from "../services/project.service";
import { S3PresignerService } from "../services/s3-presigner.service";
import { ApiGatewayEvent, ApiGatewayResponse } from "../types";
import { RequestValidator } from "../utils/request-validator";
import { ResponseBuilder } from "../utils/response-builder";
import { S3KeyBuilder } from "../utils/s3-key-builder";

export class UploadUrlHandler {
  private readonly config: Config;
  private readonly projectService: ProjectService;
  private readonly s3PresignerService: S3PresignerService;

  constructor() {
    this.config = new Config();
    this.projectService = new ProjectService(
      new DynamoDBClient({}),
      this.config.projectsTable
    );
    this.s3PresignerService = new S3PresignerService(
      new S3Client({}),
      this.config.rawBucket,
      this.config.uploadUrlExpiresIn
    );
  }

  async handle(event: ApiGatewayEvent): Promise<ApiGatewayResponse> {
    try {
      const apiKey = this.extractApiKey(event);
      const validationError = RequestValidator.validateApiKey(apiKey);
      if (validationError) {
        return ResponseBuilder.error(401, validationError);
      }

      let requestBody;
      try {
        const body =
          typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        requestBody = RequestValidator.validateRequestBody(
          body,
          this.config.allowedFileTypes
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid request body";
        return ResponseBuilder.error(400, message);
      }

      const project = await this.projectService.getProject(apiKey!);
      if (!project) {
        return ResponseBuilder.error(403, "Invalid API key");
      }

      const s3Key = S3KeyBuilder.build(
        project.projectName!,
        requestBody.path,
        requestBody.filename
      );

      const uploadUrl = await this.s3PresignerService.generatePresignedUrl(
        s3Key,
        requestBody.contentType
      );

      return ResponseBuilder.success({
        uploadUrl,
        s3Key,
      });
    } catch (error) {
      console.error("Upload URL generation error:", error);
      return ResponseBuilder.error(
        500,
        error instanceof Error ? error.message : "Internal server error"
      );
    }
  }

  private extractApiKey(event: ApiGatewayEvent): string | undefined {
    return event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
  }
}
