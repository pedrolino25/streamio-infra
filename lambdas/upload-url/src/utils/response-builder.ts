import { ApiGatewayResponse } from "../types";

export class ResponseBuilder {
  static success(data: object): ApiGatewayResponse {
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  static error(statusCode: number, message: string): ApiGatewayResponse {
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
      headers: { "Content-Type": "application/json" },
    };
  }
}

