export interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
  isBase64Encoded?: boolean;
}

export interface ApiGatewayEvent {
  httpMethod?: string;
  headers?: Record<string, string>;
  body?: string | object;
  isBase64Encoded?: boolean;
  requestContext?: {
    requestId?: string;
  };
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

