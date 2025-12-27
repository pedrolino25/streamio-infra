export interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
  isBase64Encoded?: boolean;
}

export interface ApiGatewayEvent {
  headers?: Record<string, string>;
  body?: string | object;
  isBase64Encoded?: boolean;
}

export interface RequestBody {
  filename: string;
  path: string;
  contentType: string;
}

export interface UploadData {
  filename: string;
  path?: string;
  contentType: string;
  fileBuffer: Buffer;
}

export interface Project {
  projectId: string;
  projectName?: string;
}

export interface UploadResponse {
  s3Key: string;
  message: string;
}

