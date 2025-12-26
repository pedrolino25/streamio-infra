export class Config {
  readonly ecsCluster: string;
  readonly taskDefinition: string;
  readonly subnets: string[];
  readonly securityGroup: string;

  constructor() {
    this.ecsCluster = this.getRequiredEnv("ECS_CLUSTER");
    this.taskDefinition = this.getRequiredEnv("TASK_DEFINITION");
    this.securityGroup = this.getRequiredEnv("SECURITY_GROUP");
    this.subnets = this.parseSubnets(this.getRequiredEnv("SUBNETS"));
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private parseSubnets(subnetsString: string): string[] {
    const subnets = subnetsString
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (subnets.length === 0) {
      throw new Error("No valid subnet IDs found in SUBNETS environment variable");
    }

    return subnets;
  }
}

