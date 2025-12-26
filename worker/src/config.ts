export const config = {
  rawBucket: process.env.RAW_BUCKET!,
  processedBucket: process.env.PROCESSED_BUCKET!,
  projectsTable: process.env.PROJECTS_TABLE!,
  job: JSON.parse(process.env.JOB!),
  paths: {
    input: "/tmp/input",
    output: "/tmp/output",
    videoOutput: "/tmp/output/hls",
    imageOutput: "/tmp/output/images",
  },
} as const;

function validateConfig(): void {
  const required = {
    RAW_BUCKET: config.rawBucket,
    PROCESSED_BUCKET: config.processedBucket,
    PROJECTS_TABLE: config.projectsTable,
    JOB: config.job,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (!config.job.inputKey || !config.job.outputKey) {
    throw new Error("Job must contain inputKey and outputKey");
  }
}

validateConfig();
