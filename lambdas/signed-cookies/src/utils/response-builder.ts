import { ApiGatewayResponse, ErrorCode, SignedCookies } from "../types";

export class ResponseBuilder {
  static success(
    expiresAt: number,
    cookies: SignedCookies,
    domain?: string,
    origin?: string,
    wildcardPath?: any
  ): ApiGatewayResponse {
    const cookieAttributes = this.buildCookieAttributes(domain);
    const setCookieHeaders = this.buildCookieHeaders(cookies, cookieAttributes);
    const corsHeaders = this.buildCorsHeaders(origin);

    return {
      statusCode: 200,
      body: JSON.stringify({
        expiresAt,
        wildcardPath,
        message: "Signed cookies set successfully",
      }),
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Access-Control-Expose-Headers": "Set-Cookie",
      },
      multiValueHeaders: {
        "Set-Cookie": setCookieHeaders,
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
    const allowOrigin = origin || "*";
    const allowCredentials = origin ? "true" : "false";

    return {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Allow-Credentials": allowCredentials,
    };
  }

  private static buildCookieAttributes(domain?: string): string {
    // Use custom domain for cookie Domain attribute (allows cookies to work with custom domain)
    // Fallback to CLOUDFRONT_CUSTOM_DOMAIN or CLOUDFRONT_DOMAIN if not provided
    const cookieDomain = domain || process.env.CLOUDFRONT_CUSTOM_DOMAIN || process.env.CLOUDFRONT_DOMAIN;

    const rootDomain = cookieDomain
      ? this.extractRootDomain(cookieDomain)
      : undefined;

    return rootDomain
      ? `Domain=${rootDomain}; Path=/; Secure; SameSite=None`
      : "Path=/; Secure; SameSite=None";
  }

  private static extractRootDomain(domain: string): string {
    const parts = domain.split(".");
    if (parts.length >= 2) {
      const rootParts = parts.slice(-2);
      return `.${rootParts.join(".")}`;
    }
    return `.${domain}`;
  }

  private static buildCookieHeaders(
    cookies: SignedCookies,
    cookieAttributes: string
  ): string[] {
    return [
      `CloudFront-Policy=${cookies["CloudFront-Policy"]}; ${cookieAttributes}`,
      `CloudFront-Signature=${cookies["CloudFront-Signature"]}; ${cookieAttributes}`,
      `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; ${cookieAttributes}`,
    ];
  }
}
