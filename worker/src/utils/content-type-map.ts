export function getContentTypeFromFilename(filename: string): string | undefined {
  if (filename.endsWith(".m3u8")) {
    return "application/vnd.apple.mpegurl";
  }
  if (filename.endsWith(".ts")) {
    return "video/mp2t";
  }
  return undefined;
}

