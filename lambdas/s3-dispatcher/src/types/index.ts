export interface S3EventRecord {
  s3: {
    bucket: {
      name: string;
    };
    object: {
      key: string;
      size?: number;
    };
  };
  eventName?: string;
}

export interface S3Event {
  Records: S3EventRecord[];
}

export interface Job {
  inputKey: string;
  outputKey: string;
}

export interface ProcessResult {
  success: boolean;
  recordIndex: number;
  error?: string;
}

