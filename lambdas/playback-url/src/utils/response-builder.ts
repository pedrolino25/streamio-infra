import { ApiGatewayResponse, SignedCookies } from "../types";

export class ResponseBuilder {
  static success(
    url: string,
    expiresAt: number,
    cookies: SignedCookies
  ): ApiGatewayResponse {
    return {
      statusCode: 200,
      body: JSON.stringify({ url, expiresAt }),
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": this.buildCookieHeader(cookies),
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

  private static buildCookieHeader(cookies: SignedCookies): string {
    const cookieAttributes = "Path=/; Secure; HttpOnly; SameSite=None";
    return [
      `CloudFront-Policy=${cookies["CloudFront-Policy"]}; ${cookieAttributes}`,
      `CloudFront-Signature=${cookies["CloudFront-Signature"]}; ${cookieAttributes}`,
      `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; ${cookieAttributes}`,
    ].join(", ");
  }
}

