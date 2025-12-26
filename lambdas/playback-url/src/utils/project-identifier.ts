export class ProjectIdentifierBuilder {
  static build(projectId: string, projectName?: string): string {
    if (!projectName) {
      return projectId;
    }

    const sanitized = this.sanitize(projectName);
    return sanitized || projectId;
  }

  private static sanitize(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
}

