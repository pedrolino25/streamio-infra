export interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface ApiGatewayEvent {
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
}

export interface Project {
  projectId: string;
  projectName?: string;
}

export interface SignedCookies {
  "CloudFront-Policy": string;
  "CloudFront-Signature": string;
  "CloudFront-Key-Pair-Id": string;
}
