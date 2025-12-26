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
}

async function main(): Promise<void> {
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

    await job.execute();
  } catch (error) {
    console.error("Processing failed:", error);
    const mediaType = job?.getMediaType();
    await webhookHandler.sendFailureWebhook(error, mediaType);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main:", error);
  process.exit(1);
});
