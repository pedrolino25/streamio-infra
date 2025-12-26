import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

const ecs = new ECSClient({});

const ECS_CLUSTER = process.env.ECS_CLUSTER!;
const TASK_DEFINITION = process.env.TASK_DEFINITION!;
const SUBNETS = process.env.SUBNETS!;
const SECURITY_GROUP = process.env.SECURITY_GROUP!;

interface S3EventRecord {
  s3: {
    bucket: {
      name: string;
    };
    object: {
      key: string;
      size?: number;
    };
  };
  eventName?: string;
}

interface S3Event {
  Records: S3EventRecord[];
}

interface Job {
  inputKey: string;
  outputKey: string;
}

interface ProcessResult {
  success: boolean;
  recordIndex: number;
  error?: string;
}

function validateEnvironment(): void {
  const required = {
    ECS_CLUSTER,
    TASK_DEFINITION,
    SUBNETS,
    SECURITY_GROUP,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

function extractS3Key(record: S3EventRecord): string {
  if (!record.s3?.object?.key) {
    throw new Error("Missing S3 object key in event record");
  }

  try {
    return decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  } catch (error) {
    throw new Error(
      `Failed to decode S3 key: ${record.s3.object.key} - ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function buildOutputKey(inputKey: string): string {
  return inputKey;
}

function createJob(inputKey: string): Job {
  return {
    inputKey,
    outputKey: buildOutputKey(inputKey),
  };
}

async function runEcsTask(job: Job): Promise<void> {
  const subnetIds = SUBNETS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (subnetIds.length === 0) {
    throw new Error(
      "No valid subnet IDs found in SUBNETS environment variable"
    );
  }

  await ecs.send(
    new RunTaskCommand({
      cluster: ECS_CLUSTER,
      taskDefinition: TASK_DEFINITION,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: subnetIds,
          securityGroups: [SECURITY_GROUP],
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
}

async function processRecord(
  record: S3EventRecord,
  index: number
): Promise<ProcessResult> {
  try {
    const inputKey = extractS3Key(record);
    const job = createJob(inputKey);

    console.log(
      `Processing record ${index}: inputKey=${inputKey}, outputKey=${job.outputKey}`
    );

    await runEcsTask(job);

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

export const handler = async (event: S3Event): Promise<void> => {
  try {
    validateEnvironment();
  } catch (error) {
    console.error("Environment validation failed:", error);
    throw error;
  }

  if (
    !event?.Records ||
    !Array.isArray(event.Records) ||
    event.Records.length === 0
  ) {
    console.warn("No records found in S3 event");
    return;
  }

  console.log(`Processing ${event.Records.length} S3 event record(s)`);

  const results: ProcessResult[] = [];

  for (let i = 0; i < event.Records.length; i++) {
    const result = await processRecord(event.Records[i], i);
    results.push(result);
  }

  const failed = results.filter((r) => !r.success);
  const succeeded = results.filter((r) => r.success);

  console.log(
    `Processing complete: ${succeeded.length} succeeded, ${failed.length} failed`
  );

  if (failed.length > 0) {
    console.error("Failed records:", failed);
  }
};
