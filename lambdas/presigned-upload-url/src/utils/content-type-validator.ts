export class ContentTypeValidator {
  static normalize(contentType: string): string {
    return contentType.toLowerCase().trim();
  }

  static isValid(contentType: string, allowedTypes: Set<string>): boolean {
    const normalized = this.normalize(contentType);
    return allowedTypes.has(normalized);
  }
}

