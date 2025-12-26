import { Job } from "../types";

export class JobBuilder {
  static build(inputKey: string): Job {
    return {
      inputKey,
      outputKey: this.buildOutputKey(inputKey),
    };
  }

  private static buildOutputKey(inputKey: string): string {
    return inputKey;
  }
}

