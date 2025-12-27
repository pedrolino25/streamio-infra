export class Config {
  readonly projectsTable: string;
  readonly cloudfrontDomain: string; // Domain for both policy and baseUrl
  readonly cfKeyPairId: string;
  readonly cfPrivateKey: string;
  readonly urlExpiresInSeconds: number;

  constructor() {
    this.projectsTable = this.getRequiredEnv("PROJECTS_TABLE");
    // Use custom domain if available, otherwise fallback to distribution domain
    // Policy resource MUST match the domain used in the actual request URL
    this.cloudfrontDomain =
      this.getOptionalEnv("CLOUDFRONT_CUSTOM_DOMAIN") ||
      this.getRequiredEnv("CLOUDFRONT_DOMAIN");
    this.cfKeyPairId = this.getRequiredEnv("CF_KEY_PAIR_ID");
    this.cfPrivateKey = this.getRequiredEnv("CF_PRIVATE_KEY");
    const defaultExpiration = 600; // 10 minutes (short TTL as per requirements)
    const expiration = this.getNumberEnv(
      "URL_EXPIRES_IN_SECONDS",
      defaultExpiration
    );

    this.urlExpiresInSeconds = expiration;
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private getOptionalEnv(key: string): string | undefined {
    return process.env[key];
  }

  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}

