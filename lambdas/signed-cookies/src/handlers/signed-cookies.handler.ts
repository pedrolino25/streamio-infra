import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Config } from "../config";
import { CookieSigner } from "../services/cookie-signer.service";
import { ProjectService } from "../services/project.service";
import { ApiGatewayEvent, ApiGatewayResponse, ErrorCode } from "../types";
import { RequestValidator } from "../utils/request-validator";
import { ResponseBuilder } from "../utils/response-builder";

export class SignedCookiesHandler {
  private readonly config: Config;
  private readonly projectService: ProjectService;
  private readonly cookieSigner: CookieSigner;

  constructor() {
    this.config = new Config();
    this.projectService = new ProjectService(
      new DynamoDBClient({}),
      this.config.projectsTable
    );
    this.cookieSigner = new CookieSigner(
      this.config.cloudfrontDomain,
      this.config.cfKeyPairId,
      this.config.cfPrivateKey
    );
  }

  async handle(event: ApiGatewayEvent): Promise<ApiGatewayResponse> {
    const requestId = event.requestContext?.requestId;
    const origin = this.extractHeader(event, "origin", "Origin");

    if (event.httpMethod === "OPTIONS") {
      return ResponseBuilder.options(origin);
    }

    try {
      const apiKey = this.extractHeader(event, "x-api-key", "X-Api-Key");
      const validation = RequestValidator.validateApiKey(apiKey);
      if (!validation.valid) {
        this.logError("API key validation failed", {
          requestId,
          hasApiKey: !!apiKey,
        });
        return ResponseBuilder.error(
          401,
          ErrorCode.MISSING_API_KEY,
          validation.error || "API key is required",
          origin,
          requestId
        );
      }

      const project = await this.projectService.getProject(apiKey!);
      if (!project) {
        this.logError("Project not found", {
          requestId,
          hasApiKey: true,
        });
        return ResponseBuilder.error(
          403,
          ErrorCode.INVALID_API_KEY,
          "Invalid API key",
          origin,
          requestId
        );
      }

      const wildcardPath = `/${project.projectName}/*`;
      const expires = this.calculateExpiration();
      const cookies = this.cookieSigner.sign(wildcardPath, expires);

      this.logInfo("Signed cookies generated successfully", {
        requestId,
        projectId: project.projectId,
        expires,
      });

      return ResponseBuilder.success(
        expires,
        cookies,
        this.config.cloudfrontCustomDomain,
        origin,
        wildcardPath
      );
    } catch (error) {
      return this.handleError(error, origin, requestId);
    }
  }

  private handleError(
    error: unknown,
    origin: string | undefined,
    requestId: string | undefined
  ): ApiGatewayResponse {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const isClientError = this.isClientError(errorMessage);

    this.logError("Request failed", {
      requestId,
      error: errorMessage,
      isClientError,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Don't expose internal error details to clients
    const clientMessage = isClientError
      ? errorMessage
      : "An error occurred while processing your request";

    return ResponseBuilder.error(
      isClientError ? 400 : 500,
      isClientError ? ErrorCode.SIGNING_ERROR : ErrorCode.INTERNAL_ERROR,
      clientMessage,
      origin,
      requestId
    );
  }

  private isClientError(message: string): boolean {
    return (
      message.includes("Invalid") ||
      message.includes("Missing") ||
      message.includes("required")
    );
  }

  private extractHeader(
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

  private calculateExpiration(): number {
    return Math.floor(Date.now() / 1000) + this.config.urlExpiresInSeconds;
  }

  private logInfo(message: string, context?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: "INFO", message, ...context }));
  }

  private logError(message: string, context?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: "ERROR", message, ...context }));
  }
}
