export interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
}

export interface ApiGatewayEvent {
  httpMethod?: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
  requestContext?: {
    requestId?: string;
  };
}

export interface Project {
  projectId: string;
  projectName?: string;
}

export enum ErrorCode {
  MISSING_API_KEY = "MISSING_API_KEY",
  INVALID_API_KEY = "INVALID_API_KEY",
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
  DATABASE_ERROR = "DATABASE_ERROR",
  SIGNING_ERROR = "SIGNING_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

