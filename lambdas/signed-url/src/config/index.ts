export class Config {
  readonly projectsTable: string;
  readonly cloudfrontDistributionDomain: string; // For policy resource (CloudFront requirement)
  readonly cloudfrontCustomDomain: string; // For baseUrl (user-friendly)
  readonly cfKeyPairId: string;
  readonly cfPrivateKey: string;
  readonly urlExpiresInSeconds: number;

  constructor() {
    this.projectsTable = this.getRequiredEnv("PROJECTS_TABLE");
    // Policy resource MUST use distribution domain (CloudFront requirement)
    this.cloudfrontDistributionDomain = this.getRequiredEnv("CLOUDFRONT_DOMAIN");
    // Base URL uses custom domain for user-friendly URLs
    this.cloudfrontCustomDomain =
      this.getOptionalEnv("CLOUDFRONT_CUSTOM_DOMAIN") ||
      this.cloudfrontDistributionDomain;
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

