import { ApiGatewayResponse, SignedCookies } from "../types";

export class ResponseBuilder {
  static success(
    expiresAt: number,
    cookies: SignedCookies,
    domain?: string
  ): ApiGatewayResponse {
    const cookieAttributes = this.buildCookieAttributes(domain);
    const setCookieHeaders = this.buildCookieHeaders(cookies, cookieAttributes);

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
      },
      multiValueHeaders: {
        "Set-Cookie": setCookieHeaders,
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

  private static buildCookieAttributes(domain?: string): string {
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
    return cookieDomain
      ? `Domain=${cookieDomain}; Path=/; Secure; HttpOnly; SameSite=None`
      : "Path=/; Secure; HttpOnly; SameSite=None";
  }

  private static buildCookieHeaders(
    cookies: SignedCookies,
    cookieAttributes: string
  ): string[] {
    // Build separate Set-Cookie headers for each cookie
    // API Gateway requires multiple Set-Cookie headers to be in multiValueHeaders
    // Each cookie must be sent as a separate header entry
    return [
      `CloudFront-Policy=${cookies["CloudFront-Policy"]}; ${cookieAttributes}`,
      `CloudFront-Signature=${cookies["CloudFront-Signature"]}; ${cookieAttributes}`,
      `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; ${cookieAttributes}`,
    ];
  }
}
