import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ApiGatewayEvent, ApiGatewayResponse } from "../types";
import { Config } from "../config";
import { ProjectService } from "../services/project.service";
import { CookieSigner } from "../services/cookie-signer.service";
import { ProjectIdentifierBuilder } from "../utils/project-identifier";
import { PathBuilder } from "../utils/path-builder";
import { RequestValidator } from "../utils/request-validator";
import { ResponseBuilder } from "../utils/response-builder";

export class PlaybackUrlHandler {
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

      const userPath = event.queryStringParameters?.key;
      const pathError = RequestValidator.validatePath(userPath);
      if (pathError) {
        return ResponseBuilder.error(400, pathError);
      }

      const project = await this.projectService.getProject(apiKey!);
      if (!project) {
        return ResponseBuilder.error(403, "Invalid API key");
      }

      const projectIdentifier = ProjectIdentifierBuilder.build(
        project.projectId,
        project.projectName
      );

      const expires = this.calculateExpiration();
      const fullPath = PathBuilder.buildFullPath(projectIdentifier, userPath!);
      const wildcardPath = PathBuilder.buildWildcardPath(
        projectIdentifier,
        userPath!
      );

      const cookies = this.cookieSigner.sign(wildcardPath, expires);
      const cloudfrontUrl = `https://${this.config.cloudfrontDomain}${fullPath}`;

      return ResponseBuilder.success(cloudfrontUrl, expires, cookies);
    } catch (error) {
      console.error("Playback URL generation error:", error);
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

