export interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface ApiGatewayEvent {
  headers?: Record<string, string>;
  body?: string | object;
}

export interface RequestBody {
  filename: string;
  path: string;
  contentType: string;
}

export interface Project {
  projectId: string;
  projectName?: string;
}

export interface UploadResponse {
  uploadUrl: string;
  s3Key: string;
}

