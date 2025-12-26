import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
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
      throw new Error(
        `Failed to retrieve project: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

