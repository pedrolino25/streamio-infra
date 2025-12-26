import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { ALLOWED_IMAGE_TYPES, ProcessingResult } from "../types.js";
import { BaseProcessor } from "./base-processor.js";

export class ImageProcessor extends BaseProcessor {
  private readonly outputFormats = ["webp", "avif", "jpg"] as const;
  private readonly sizes = [
    { name: "thumbnail", width: 150 },
    { name: "small", width: 400 },
    { name: "medium", width: 800 },
    { name: "large", width: 1200 },
    { name: "original", width: 0 }, // 0 means no resize
  ] as const;

  canProcess(contentType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase() as any);
  }

  getMediaType(): "image" {
    return "image";
  }

  async process(
    inputPath: string,
    outputPath: string
  ): Promise<ProcessingResult> {
    await this.ensureOutputDirectory(outputPath);

    const ffmpegPath = this.getFfmpegPath();
    const outputFiles: string[] = [];

    for (const format of this.outputFormats) {
      for (const size of this.sizes) {
        const outputFileName = `${size.name}.${format}`;
        const outputFile = path.join(outputPath, outputFileName);

        await this.convertImage(
          ffmpegPath,
          inputPath,
          outputFile,
          size.width,
          format
        );

        outputFiles.push(outputFile);
      }
    }

    return {
      outputPath,
      outputFiles,
    };
  }

  private getFfmpegPath(): string {
    const candidates = [
      "/usr/bin/ffmpeg",
      "/usr/local/bin/ffmpeg",
      "/bin/ffmpeg",
    ];

    const found = candidates.find(fs.existsSync);
    if (!found) {
      throw new Error("FFmpeg not found in container");
    }
    return found;
  }

  private async convertImage(
    ffmpegPath: string,
    inputPath: string,
    outputPath: string,
    width: number,
    format: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = ["-y", "-i", inputPath];

      if (width > 0) {
        args.push("-vf", `scale=${width}:-1:flags=lanczos`);
      }

      if (format === "webp") {
        args.push("-quality", "85");
        args.push("-c:v", "libwebp");
      } else if (format === "avif") {
        args.push("-c:v", "libaom-av1");
        args.push("-crf", "30");
        args.push("-b:v", "0");
        args.push("-still-picture", "1");
      } else if (format === "jpg") {
        args.push("-q:v", "3");
        args.push("-c:v", "mjpeg");
      }

      args.push(outputPath);

      const ff = spawn(ffmpegPath, args, {
        stdio: ["ignore", "ignore", "pipe"],
      });

      let stderr = "";
      ff.stderr.on("data", (d) => (stderr += d.toString()));

      ff.on("close", (code) => {
        if (code === 0) return resolve();
        if (format === "avif") {
          console.warn(
            `AVIF encoding failed for ${outputPath}, this format may not be supported. Error: ${stderr}`
          );
          resolve();
          return;
        }
        reject(new Error(`FFmpeg failed (${code}):\n${stderr}`));
      });

      ff.on("error", reject);
    });
  }
}
