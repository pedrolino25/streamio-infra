import { ApiGatewayResponse, ErrorCode } from "../types";

export class ResponseBuilder {
  static success(
    baseUrl: string,
    queryParams: string,
    expiresAt: number,
    projectId: string,
    origin?: string
  ): ApiGatewayResponse {
    const corsHeaders = this.buildCorsHeaders(origin);

    return {
      statusCode: 200,
      body: JSON.stringify({
        baseUrl,
        queryParams,
        expiresAt,
        projectId,
        message:
          "Signed URL parameters generated successfully. Append queryParams to any file path under baseUrl.",
      }),
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    };
  }

  static error(
    statusCode: number,
    code: ErrorCode,
    message: string,
    origin?: string,
    requestId?: string
  ): ApiGatewayResponse {
    const corsHeaders = this.buildCorsHeaders(origin);
    const body: { error: string; code: string; requestId?: string } = {
      error: message,
      code,
    };
    if (requestId) {
      body.requestId = requestId;
    }

    return {
      statusCode,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    };
  }

  static options(origin?: string): ApiGatewayResponse {
    const corsHeaders = this.buildCorsHeaders(origin);
    return {
      statusCode: 200,
      body: "",
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    };
  }

  private static buildCorsHeaders(origin?: string): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Allow-Credentials": "false",
    };
  }
}
