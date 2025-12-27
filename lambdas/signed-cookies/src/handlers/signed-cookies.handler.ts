import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Config } from "../config";
import { CookieSigner } from "../services/cookie-signer.service";
import { ProjectService } from "../services/project.service";
import { ApiGatewayEvent, ApiGatewayResponse } from "../types";
import { ProjectIdentifierBuilder } from "../utils/project-identifier";
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
    try {
      const apiKey = this.extractApiKey(event);
      const validationError = RequestValidator.validateApiKey(apiKey);
      if (validationError) {
        return ResponseBuilder.error(401, validationError);
      }

      const project = await this.projectService.getProject(apiKey!);
      if (!project) {
        return ResponseBuilder.error(403, "Invalid API key");
      }

      const projectIdentifier = ProjectIdentifierBuilder.build(
        project.projectId,
        project.projectName
      );

      const wildcardPath = `/projects/${projectIdentifier}/*`;

      const expires = this.calculateExpiration();
      const cookies = this.cookieSigner.sign(wildcardPath, expires);

      return ResponseBuilder.success(expires, cookies);
    } catch (error) {
      console.error("Signed cookies generation error:", error);
      return ResponseBuilder.error(
        500,
        error instanceof Error ? error.message : "Internal server error"
      );
    }
  }

  private extractApiKey(event: ApiGatewayEvent): string | undefined {
    return event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
  }

  private calculateExpiration(): number {
    return Math.floor(Date.now() / 1000) + this.config.urlExpiresInSeconds;
  }
}
