import path from "path";

export function extractProjectIdentifier(s3Key: string): string | null {
  const match = s3Key.match(/^([^/]+)\//);
  return match ? match[1] : null;
}

export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function getInputPath(
  inputKey: string,
  defaultExt: string = ".mp4"
): string {
  const inputExt = path.extname(inputKey) || defaultExt;
  return `/tmp/input${inputExt}`;
}

export function getOutputPath(mediaType: "video" | "image"): string {
  return mediaType === "video" ? "/tmp/output/hls" : "/tmp/output/images";
}
