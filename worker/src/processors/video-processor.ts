import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { ALLOWED_VIDEO_TYPES, ProcessingResult } from "../types.js";
import { BaseProcessor } from "./base-processor.js";

export class VideoProcessor extends BaseProcessor {
  canProcess(contentType: string): boolean {
    return ALLOWED_VIDEO_TYPES.includes(contentType.toLowerCase() as any);
  }

  getMediaType(): "video" {
    return "video";
  }

  async process(
    inputPath: string,
    outputPath: string
  ): Promise<ProcessingResult> {
    await this.ensureOutputDirectory(outputPath);

    const ffmpegPath = this.getFfmpegPath();
    await this.runFfmpeg(ffmpegPath, inputPath, outputPath);

    const outputFiles = await this.listOutputFiles(outputPath);

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

  private async runFfmpeg(
    ffmpegPath: string,
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-i",
        inputPath,

        "-filter_complex",
        [
          "[0:v]fps=30,split=5[v240][v360][v480][v720][v1080];",

          "[v240]scale=426:240:force_original_aspect_ratio=decrease," +
            "scale=trunc(iw/2)*2:trunc(ih/2)*2,split=2[v240_avc][v240_hevc];",

          "[v360]scale=640:360:force_original_aspect_ratio=decrease," +
            "scale=trunc(iw/2)*2:trunc(ih/2)*2,split=2[v360_avc][v360_hevc];",

          "[v480]scale=854:480:force_original_aspect_ratio=decrease," +
            "scale=trunc(iw/2)*2:trunc(ih/2)*2,split=2[v480_avc][v480_hevc];",

          "[v720]scale=1280:720:force_original_aspect_ratio=decrease," +
            "scale=trunc(iw/2)*2:trunc(ih/2)*2,split=2[v720_avc][v720_hevc];",

          "[v1080]scale=1920:1080:force_original_aspect_ratio=decrease," +
            "scale=trunc(iw/2)*2:trunc(ih/2)*2,split=2[v1080_avc][v1080_hevc];",

          "[0:a]asplit=10[a0][a1][a2][a3][a4][a5][a6][a7][a8][a9];",
        ].join(""),

        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
        "-ar",
        "48000",

        "-map",
        "[v240_avc]",
        "-map",
        "[a0]",
        "-map",
        "[v360_avc]",
        "-map",
        "[a1]",
        "-map",
        "[v480_avc]",
        "-map",
        "[a2]",
        "-map",
        "[v720_avc]",
        "-map",
        "[a3]",
        "-map",
        "[v1080_avc]",
        "-map",
        "[a4]",

        "-c:v:0",
        "libx264",
        "-profile:v:0",
        "main",
        "-pix_fmt:v:0",
        "yuv420p",

        "-b:v:0",
        "400k",
        "-b:v:1",
        "800k",
        "-b:v:2",
        "1400k",
        "-b:v:3",
        "2800k",
        "-b:v:4",
        "5000k",

        "-maxrate:v:0",
        "480k",
        "-maxrate:v:1",
        "960k",
        "-maxrate:v:2",
        "1680k",
        "-maxrate:v:3",
        "3360k",
        "-maxrate:v:4",
        "6000k",

        "-bufsize:v:0",
        "800k",
        "-bufsize:v:1",
        "1600k",
        "-bufsize:v:2",
        "2800k",
        "-bufsize:v:3",
        "5600k",
        "-bufsize:v:4",
        "10000k",

        "-map",
        "[v240_hevc]",
        "-map",
        "[a5]",
        "-map",
        "[v360_hevc]",
        "-map",
        "[a6]",
        "-map",
        "[v480_hevc]",
        "-map",
        "[a7]",
        "-map",
        "[v720_hevc]",
        "-map",
        "[a8]",
        "-map",
        "[v1080_hevc]",
        "-map",
        "[a9]",

        "-c:v:5",
        "libx265",
        "-tag:v:5",
        "hvc1",
        "-pix_fmt:v:5",
        "yuv420p",

        "-b:v:5",
        "280k",
        "-b:v:6",
        "560k",
        "-b:v:7",
        "1000k",
        "-b:v:8",
        "2000k",
        "-b:v:9",
        "3600k",

        "-g",
        "60",
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0",

        "-f",
        "hls",
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",
        "-hls_flags",
        "independent_segments",
        "-master_pl_name",
        "master.m3u8",

        "-var_stream_map",
        [
          "v:0,a:0",
          "v:1,a:1",
          "v:2,a:2",
          "v:3,a:3",
          "v:4,a:4",
          "v:5,a:5",
          "v:6,a:6",
          "v:7,a:7",
          "v:8,a:8",
          "v:9,a:9",
        ].join(" "),

        "-hls_segment_filename",
        path.join(outputPath, "stream_%v", "seg_%03d.ts"),

        path.join(outputPath, "stream_%v", "index.m3u8"),
      ];

      const ff = spawn(ffmpegPath, args, {
        stdio: ["ignore", "ignore", "pipe"],
      });

      let stderr = "";
      ff.stderr.on("data", (d) => (stderr += d.toString()));

      ff.on("close", (code) => {
        if (code === 0) return resolve();
        reject(new Error(`FFmpeg failed (${code}):\n${stderr}`));
      });

      ff.on("error", reject);
    });
  }

  private async listOutputFiles(outputPath: string): Promise<string[]> {
    const files: string[] = [];

    async function traverse(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await traverse(outputPath);
    return files;
  }
}
