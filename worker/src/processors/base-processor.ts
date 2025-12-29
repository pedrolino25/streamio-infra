import fs from "fs";
import { MediaType, ProcessingResult } from "../types.js";

export interface IProcessor {
  canProcess(contentType: string): boolean;
  process(inputPath: string, outputPath: string): Promise<ProcessingResult>;
  getMediaType(): MediaType;
}

export abstract class BaseProcessor implements IProcessor {
  abstract canProcess(contentType: string): boolean;
  abstract process(
    inputPath: string,
    outputPath: string
  ): Promise<ProcessingResult>;
  abstract getMediaType(): MediaType;

  protected async ensureOutputDirectory(outputPath: string): Promise<void> {
    await fs.promises.mkdir(outputPath, { recursive: true });
  }
}
