import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { config } from "../config.js";
import { sanitizeProjectName } from "../utils.js";

export class DatabaseService {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({});
  }

  async getWebhookUrl(projectIdentifier: string): Promise<string | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: config.projectsTable,
        Key: { project_id: { S: projectIdentifier } },
      })
    );

    if (result.Item?.webhook_url?.S) {
      return result.Item.webhook_url.S;
    }

    const scan = await this.client.send(
      new ScanCommand({
        TableName: config.projectsTable,
        FilterExpression: "attribute_exists(project_name)",
      })
    );

    const match = scan.Items?.find((item: any) => {
      const name = item.project_name?.S;
      if (!name) return false;
      const sanitized = sanitizeProjectName(name);
      return sanitized === projectIdentifier;
    });

    return match?.webhook_url?.S ?? null;
  }
}
