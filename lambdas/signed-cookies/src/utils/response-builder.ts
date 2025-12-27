import { ApiGatewayResponse, SignedCookies } from "../types";

export class ResponseBuilder {
  static success(
    expiresAt: number,
    cookies: SignedCookies
  ): ApiGatewayResponse {
    return {
      statusCode: 200,
      body: JSON.stringify({
        expiresAt,
        message:
          "Signed cookies set successfully. Cookies are now available for CloudFront requests.",
      }),
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": this.buildCookieHeader(cookies),
        // CORS headers required when setting cookies from API Gateway
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers": "Set-Cookie",
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
    // Cookie attributes required for CloudFront signed cookies:
    // - Path=/: Available for all paths under the domain
    // - Secure: Only sent over HTTPS
    // - HttpOnly: Not accessible via JavaScript (security)
    // - SameSite=None: Required for cross-origin cookie setting
    const cookieAttributes = "Path=/; Secure; HttpOnly; SameSite=None";

    // Build Set-Cookie header with all three required cookies
    // Multiple Set-Cookie headers should be separate (API Gateway will handle this)
    return [
      `CloudFront-Policy=${cookies["CloudFront-Policy"]}; ${cookieAttributes}`,
      `CloudFront-Signature=${cookies["CloudFront-Signature"]}; ${cookieAttributes}`,
      `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; ${cookieAttributes}`,
    ].join(", ");
  }
}
