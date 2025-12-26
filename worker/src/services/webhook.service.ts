import fetch from "node-fetch";
import { WebhookPayload } from "../types.js";

export class WebhookService {
  async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }
}
