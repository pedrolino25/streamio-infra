import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Job } from "../types";

export class EcsService {
  constructor(
    private readonly ecs: ECSClient,
    private readonly cluster: string,
    private readonly taskDefinition: string,
    private readonly subnets: string[],
    private readonly securityGroup: string
  ) {}

  async runTask(job: Job): Promise<void> {
    try {
      await this.ecs.send(
        new RunTaskCommand({
          cluster: this.cluster,
          taskDefinition: this.taskDefinition,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: this.subnets,
              securityGroups: [this.securityGroup],
              assignPublicIp: "ENABLED",
            },
          },
          overrides: {
            containerOverrides: [
              {
                name: "worker",
                environment: [
                  {
                    name: "JOB",
                    value: JSON.stringify(job),
                  },
                ],
              },
            ],
          },
        })
      );
    } catch (error) {
      throw new Error(
        `Failed to run ECS task: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

