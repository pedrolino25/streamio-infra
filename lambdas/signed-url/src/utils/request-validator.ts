export class RequestValidator {
  static validateApiKey(apiKey: string | undefined | null): {
    valid: boolean;
    error?: string;
  } {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return { valid: false, error: "API key is required" };
    }
    return { valid: true };
  }
}
