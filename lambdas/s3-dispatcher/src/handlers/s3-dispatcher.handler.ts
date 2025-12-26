import { ECSClient } from "@aws-sdk/client-ecs";
import { S3Event, S3EventRecord, ProcessResult } from "../types";
import { Config } from "../config";
import { EcsService } from "../services/ecs.service";
import { S3KeyExtractor } from "../utils/s3-key-extractor";
import { JobBuilder } from "../utils/job-builder";

export class S3DispatcherHandler {
  private readonly config: Config;
  private readonly ecsService: EcsService;

  constructor() {
    this.config = new Config();
    this.ecsService = new EcsService(
      new ECSClient({}),
      this.config.ecsCluster,
      this.config.taskDefinition,
      this.config.subnets,
      this.config.securityGroup
    );
  }

  async handle(event: S3Event): Promise<void> {
    if (!this.isValidEvent(event)) {
      console.warn("No records found in S3 event");
      return;
    }

    console.log(`Processing ${event.Records.length} S3 event record(s)`);

    const results = await this.processRecords(event.Records);
    this.logResults(results);
  }

  private isValidEvent(event: S3Event | null | undefined): boolean {
    return (
      event?.Records !== undefined &&
      Array.isArray(event.Records) &&
      event.Records.length > 0
    );
  }

  private async processRecords(records: S3EventRecord[]): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];

    for (let i = 0; i < records.length; i++) {
      const result = await this.processRecord(records[i], i);
      results.push(result);
    }

    return results;
  }

  private async processRecord(
    record: S3EventRecord,
    index: number
  ): Promise<ProcessResult> {
    try {
      const inputKey = S3KeyExtractor.extract(record);
      const job = JobBuilder.build(inputKey);

      console.log(
        `Processing record ${index}: inputKey=${inputKey}, outputKey=${job.outputKey}`
      );

      await this.ecsService.runTask(job);

      console.log(
        `Successfully started ECS task for record ${index}: ${inputKey}`
      );

      return { success: true, recordIndex: index };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to process record ${index}:`, errorMessage);

      return {
        success: false,
        recordIndex: index,
        error: errorMessage,
      };
    }
  }

  private logResults(results: ProcessResult[]): void {
    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    console.log(
      `Processing complete: ${succeeded.length} succeeded, ${failed.length} failed`
    );

    if (failed.length > 0) {
      console.error("Failed records:", failed);
    }
  }
}

