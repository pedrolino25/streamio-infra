export class PathBuilder {
  static buildFullPath(projectIdentifier: string, userPath: string): string {
    const normalized = this.normalize(userPath);
    return `/projects/${projectIdentifier}/${normalized}`;
  }

  static buildWildcardPath(projectIdentifier: string, userPath: string): string {
    const normalized = this.normalize(userPath);
    const wildcardPath = this.toWildcardPath(normalized);
    return `/projects/${projectIdentifier}/${wildcardPath}`;
  }

  private static normalize(path: string): string {
    return path.replace(/^\/+|\/+$/g, "");
  }

  private static toWildcardPath(path: string): string {
    if (path.endsWith("/*")) {
      return path;
    }

    const lastSlashIndex = path.lastIndexOf("/");
    if (lastSlashIndex >= 0) {
      return `${path.substring(0, lastSlashIndex)}/*`;
    }

    return "*";
  }
}

