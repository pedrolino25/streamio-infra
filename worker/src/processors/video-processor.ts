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

    for (let i = 0; i < 5; i++) {
      await fs.promises.mkdir(path.join(outputPath, `stream_${i}`), {
        recursive: true,
      });
    }

    await this.runFfmpeg(inputPath, outputPath);

    const outputFiles = await this.listOutputFiles(outputPath);
    return { outputPath, outputFiles };
  }

  private async runFfmpeg(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-loglevel",
        "error",
        "-threads",
        "0",

        "-i",
        inputPath,

        // -------- FILTER GRAPH --------
        "-filter_complex",
        `
          [0:v]fps=30,split=5[v1][v2][v3][v4][v5];
          [v1]scale=426:240:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v240];
          [v2]scale=640:360:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v360];
          [v3]scale=854:480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v480];
          [v4]scale=1280:720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v720];
          [v5]scale=1920:1080:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1080];
          [0:a]asplit=5[a0][a1][a2][a3][a4]
        `.replace(/\s+/g, " "),

        // -------- STREAM MAP --------
        "-map",
        "[v240]",
        "-map",
        "[a0]",
        "-map",
        "[v360]",
        "-map",
        "[a1]",
        "-map",
        "[v480]",
        "-map",
        "[a2]",
        "-map",
        "[v720]",
        "-map",
        "[a3]",
        "-map",
        "[v1080]",
        "-map",
        "[a4]",

        // -------- VIDEO --------
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-g",
        "60",
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0",

        // -------- AUDIO --------
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
        "-ar",
        "48000",

        // -------- BITRATE LADDER --------
        "-b:v:0",
        "300k",
        "-b:v:1",
        "750k",
        "-b:v:2",
        "1200k",
        "-b:v:3",
        "2500k",
        "-b:v:4",
        "5000k",

        "-maxrate:v:0",
        "360k",
        "-maxrate:v:1",
        "900k",
        "-maxrate:v:2",
        "1440k",
        "-maxrate:v:3",
        "3000k",
        "-maxrate:v:4",
        "6000k",

        "-bufsize:v:0",
        "600k",
        "-bufsize:v:1",
        "1500k",
        "-bufsize:v:2",
        "2400k",
        "-bufsize:v:3",
        "5000k",
        "-bufsize:v:4",
        "10000k",

        // -------- HLS --------
        "-f",
        "hls",
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",

        "-hls_flags",
        "independent_segments+program_date_time",

        "-master_pl_name",
        "master.m3u8",

        "-var_stream_map",
        "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3 v:4,a:4",

        "-hls_segment_filename",
        path.join(outputPath, "stream_%v", "seg_%03d.ts"),

        path.join(outputPath, "stream_%v", "index.m3u8"),
      ];

      const ff = spawn("ffmpeg", args, {
        stdio: ["ignore", "ignore", "pipe"],
      });

      let stderr = "";
      ff.stderr.on("data", (d) => (stderr += d.toString()));

      ff.once("error", reject);
      ff.once("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed (${code}):\n${stderr}`));
      });
    });
  }

  private async listOutputFiles(outputPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else files.push(p);
      }
    }

    await walk(outputPath);
    return files;
  }
}
