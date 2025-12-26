export class RequestValidator {
  static validateApiKey(apiKey: string | undefined): string | null {
    if (!apiKey) {
      return "Missing API key";
    }
    return null;
  }

  static validatePath(path: string | undefined | null): string | null {
    if (!path) {
      return "Missing path parameter";
    }
    return null;
  }
}

