export class S3KeyBuilder {
  static build(
    projectIdentifier: string,
    filePath: string,
    filename: string
  ): string {
    const normalizedPath = filePath.replace(/^\/+|\/+$/g, "");
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : "";
    return `${projectIdentifier}/${pathPrefix}${filename}`;
  }
}
