import { ApiGatewayResponse } from "../types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, X-Filename, X-Path",
  "Access-Control-Allow-Credentials": "false",
};

export class ResponseBuilder {
  static success(data: object): ApiGatewayResponse {
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    };
  }

  static error(statusCode: number, message: string): ApiGatewayResponse {
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    };
  }

  static options(): ApiGatewayResponse {
    return {
      statusCode: 200,
      body: "",
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Max-Age": "86400",
      },
    };
  }
}
