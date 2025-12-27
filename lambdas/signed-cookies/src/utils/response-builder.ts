import { ApiGatewayResponse, SignedCookies } from "../types";

export class ResponseBuilder {
  static success(
    expiresAt: number,
    cookies: SignedCookies,
    domain?: string
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "false",
        "Access-Control-Expose-Headers": "Set-Cookie",
        "Set-Cookie": this.buildCookieHeader(cookies, domain),
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

  private static buildCookieHeader(
    cookies: SignedCookies,
    domain?: string
  ): string {
    // Get domain from parameter or environment variable
    const cookieDomain = domain || process.env.CLOUDFRONT_DOMAIN;

    // Cookie attributes required for CloudFront signed cookies:
    // - Domain: Set to the custom CloudFront domain (e.g., cdn.example.com)
    //   Note: Without leading dot means cookie only works for exact domain match
    //   This ensures cookies only work with the specific CloudFront custom domain
    // - Path=/: Available for all paths under the domain
    // - Secure: Only sent over HTTPS (required for CloudFront)
    // - HttpOnly: Not accessible via JavaScript (security)
    // - SameSite=None: Required for cross-origin cookie setting (API Gateway to CloudFront)
    const cookieAttributes = cookieDomain
      ? `Domain=${cookieDomain}; Path=/; Secure; HttpOnly; SameSite=None`
      : "Path=/; Secure; HttpOnly; SameSite=None";

    // Build Set-Cookie header with all three required cookies
    // Multiple Set-Cookie headers should be separate (API Gateway will handle this)
    return [
      `CloudFront-Policy=${cookies["CloudFront-Policy"]}; ${cookieAttributes}`,
      `CloudFront-Signature=${cookies["CloudFront-Signature"]}; ${cookieAttributes}`,
      `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; ${cookieAttributes}`,
    ].join(", ");
  }
}
