import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { ProcessorFactory } from "./processors/processor-factory.js";
import { DatabaseService } from "./services/database.service.js";
import { StorageService } from "./services/storage.service.js";
import { WebhookHandlerService } from "./services/webhook-handler.service.js";
import { WebhookService } from "./services/webhook.service.js";
import { getInputPath, getOutputPath, normalizePath } from "./utils.js";
import { getContentTypeFromFilename } from "./utils/content-type-map.js";

class ProcessingJob {
  private mediaType: "video" | "image" | undefined;

  constructor(
    private storageService: StorageService,
    private processorFactory: ProcessorFactory,
    private webhookHandler: WebhookHandlerService
  ) {}

  getMediaType(): "video" | "image" | undefined {
    return this.mediaType;
  }

  async execute(): Promise<void> {
    const version = execSync("ffmpeg -version").toString();
    console.log("FFmpeg version:", version);
    console.log(
      `Processing job: ${config.job.inputKey} -> ${config.job.outputKey}`
    );

    const inputPath = getInputPath(config.job.inputKey);
    console.log("Downloading input file...");
    await this.storageService.downloadFile(config.job.inputKey, inputPath);

    console.log("Determining processor...");
    const processor = await this.processorFactory.getProcessor(
      config.job.inputKey
    );

    this.mediaType = processor.getMediaType() as "video" | "image";
    const outputPath = getOutputPath(this.mediaType);

    console.log("Processing file...");
    const result = await processor.process(inputPath, outputPath);

    console.log("Uploading processed files...");
    const outputDir = path.dirname(config.job.outputKey);
    const normalizedOutputDir = normalizePath(outputDir);

    await this.storageService.uploadDirectory(
      outputPath,
      normalizedOutputDir,
      getContentTypeFromFilename
    );

    console.log(`Successfully processed ${result.outputFiles.length} files`);

    await this.webhookHandler.sendSuccessWebhook(this.mediaType);
  }

  async cleanup(): Promise<void> {
    // Clean up temporary files to free memory
    const tempPaths = [
      getInputPath(config.job.inputKey),
      getOutputPath(this.mediaType || "video"),
    ];

    for (const tempPath of tempPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          const stat = await fs.promises.stat(tempPath);
          if (stat.isDirectory()) {
            await fs.promises.rm(tempPath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(tempPath);
          }
          console.log(`Cleaned up temp file: ${tempPath}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${tempPath}:`, error);
      }
    }
  }
}

function logMemoryUsage(label: string): void {
  const usage = process.memoryUsage();
  console.log(
    `[Memory ${label}] RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB, ` +
      `Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB, ` +
      `Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB, ` +
      `External: ${(usage.external / 1024 / 1024).toFixed(2)}MB`
  );
}

async function main(): Promise<void> {
  logMemoryUsage("startup");

  const storageService = new StorageService();
  const processorFactory = new ProcessorFactory();
  const databaseService = new DatabaseService();
  const webhookService = new WebhookService();
  const webhookHandler = new WebhookHandlerService(
    databaseService,
    webhookService
  );

  let job: ProcessingJob | undefined;

  try {
    job = new ProcessingJob(storageService, processorFactory, webhookHandler);

    logMemoryUsage("before-execute");
    await job.execute();
    logMemoryUsage("after-execute");

    // Clean up temporary files
    await job.cleanup();
    logMemoryUsage("after-cleanup");

    // Force garbage collection hint (if --expose-gc is enabled)
    if (global.gc) {
      global.gc();
      logMemoryUsage("after-gc");
    }
  } catch (error) {
    console.error("Processing failed:", error);
    const mediaType = job?.getMediaType();
    await webhookHandler.sendFailureWebhook(error, mediaType);

    // Attempt cleanup even on failure
    if (job) {
      try {
        await job.cleanup();
      } catch (cleanupError) {
        console.warn("Cleanup failed:", cleanupError);
      }
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main:", error);
  process.exit(1);
});
