export class Config {
  readonly projectsTable: string;
  readonly cloudfrontDomain: string;
  readonly cfKeyPairId: string;
  readonly cfPrivateKey: string;
  readonly urlExpiresInSeconds: number;

  constructor() {
    this.projectsTable = this.getRequiredEnv("PROJECTS_TABLE");
    this.cloudfrontDomain = this.getRequiredEnv("CLOUDFRONT_DOMAIN");
    this.cfKeyPairId = this.getRequiredEnv("CF_KEY_PAIR_ID");
    this.cfPrivateKey = this.getRequiredEnv("CF_PRIVATE_KEY");
    this.urlExpiresInSeconds = this.getNumberEnv("URL_EXPIRES_IN_SECONDS", 86400);
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}

