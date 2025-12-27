export class Config {
  readonly projectsTable: string;
  readonly cloudfrontDomain: string; // Actual CloudFront distribution domain (for signed cookie validation)
  readonly cloudfrontCustomDomain: string; // Custom domain (for cookie Domain attribute)
  readonly cfKeyPairId: string;
  readonly cfPrivateKey: string;
  readonly urlExpiresInSeconds: number;

  constructor() {
    this.projectsTable = this.getRequiredEnv("PROJECTS_TABLE");
    // Use actual CloudFront distribution domain for signed cookie validation
    // Signed cookies MUST be validated against the distribution domain, not the CNAME
    this.cloudfrontDomain = this.getRequiredEnv("CLOUDFRONT_DOMAIN");
    // Custom domain for cookie Domain attribute (allows cookies to work with custom domain)
    this.cloudfrontCustomDomain = this.getOptionalEnv("CLOUDFRONT_CUSTOM_DOMAIN") || this.cloudfrontDomain;
    this.cfKeyPairId = this.getRequiredEnv("CF_KEY_PAIR_ID");
    this.cfPrivateKey = this.getRequiredEnv("CF_PRIVATE_KEY");
    const defaultExpiration = 86400; // 24 hours
    const expiration = this.getNumberEnv(
      "COOKIE_EXPIRES_IN_SECONDS",
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
