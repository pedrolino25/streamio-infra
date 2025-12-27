import {
  DynamoDBClient,
  GetItemCommand,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { Project } from "../types";

export class ProjectService {
  constructor(
    private readonly db: DynamoDBClient,
    private readonly tableName: string
  ) {}

  async getProject(apiKey: string): Promise<Project | null> {
    try {
      const result = await this.db.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: { project_id: { S: apiKey } },
        })
      );

      if (!result.Item) {
        return null;
      }

      return {
        projectId: result.Item.project_id.S!,
        projectName: result.Item.project_name?.S,
      };
    } catch (error) {
      // Handle specific AWS errors
      if (error instanceof ProvisionedThroughputExceededException) {
        throw new Error("Service temporarily unavailable. Please try again later.");
      }
      if (error instanceof ResourceNotFoundException) {
        throw new Error("Configuration error: projects table not found");
      }

      // Log full error for debugging, but return generic message
      console.error("DynamoDB error:", {
        error: error instanceof Error ? error.message : String(error),
        tableName: this.tableName,
      });

      throw new Error("Failed to retrieve project information");
    }
  }
}
