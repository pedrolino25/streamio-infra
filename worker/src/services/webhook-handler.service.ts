import { config } from "../config.js";
import { WebhookPayload, WEBHOOK_EVENTS } from "../types.js";
import { extractProjectIdentifier } from "../utils.js";
import { DatabaseService } from "./database.service.js";
import { WebhookService } from "./webhook.service.js";

export class WebhookHandlerService {
  constructor(
    private databaseService: DatabaseService,
    private webhookService: WebhookService
  ) {}

  async sendSuccessWebhook(mediaType: "video" | "image"): Promise<void> {
    const projectIdentifier = extractProjectIdentifier(config.job.inputKey);
    if (!projectIdentifier) {
      console.warn("Cannot send webhook: no project identifier found");
      return;
    }

    const webhookUrl = await this.databaseService.getWebhookUrl(
      projectIdentifier
    );
    if (!webhookUrl) {
      console.warn("Cannot send webhook: no webhook URL configured");
      return;
    }

    const eventType =
      mediaType === "video"
        ? WEBHOOK_EVENTS.VIDEO_PROCESSED
        : WEBHOOK_EVENTS.IMAGE_PROCESSED;

    const payload: WebhookPayload = {
      event: eventType,
      project_identifier: projectIdentifier,
      input_key: config.job.inputKey,
      output_key: config.job.outputKey,
      processed_bucket: config.processedBucket,
      timestamp: new Date().toISOString(),
    };

    await this.webhookService.sendWebhook(webhookUrl, payload);
    console.log("Success webhook notification sent");
  }

  async sendFailureWebhook(
    error: unknown,
    mediaType?: "video" | "image"
  ): Promise<void> {
    try {
      const projectIdentifier = extractProjectIdentifier(config.job.inputKey);
      if (!projectIdentifier) {
        console.warn("Cannot send failure webhook: no project identifier found");
        return;
      }

      const webhookUrl = await this.databaseService.getWebhookUrl(
        projectIdentifier
      );
      if (!webhookUrl) {
        console.warn(
          "Cannot send failure webhook: no webhook URL configured"
        );
        return;
      }

      const errorMessage = this.extractErrorMessage(error);
      const eventType = this.getFailureEventType(mediaType);

      const payload: WebhookPayload = {
        event: eventType,
        project_identifier: projectIdentifier,
        input_key: config.job.inputKey,
        output_key: config.job.outputKey,
        processed_bucket: config.processedBucket,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };

      await this.webhookService.sendWebhook(webhookUrl, payload);
      console.log("Failure webhook notification sent");
    } catch (webhookError) {
      console.error("Failed to send failure webhook:", webhookError);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }

  private getFailureEventType(
    mediaType?: "video" | "image"
  ): typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS] {
    if (!mediaType) {
      return WEBHOOK_EVENTS.PROCESSING_FAILED;
    }
    return mediaType === "video"
      ? WEBHOOK_EVENTS.VIDEO_PROCESSING_FAILED
      : WEBHOOK_EVENTS.IMAGE_PROCESSING_FAILED;
  }
}

