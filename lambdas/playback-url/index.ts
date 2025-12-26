import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "crypto";

const db = new DynamoDBClient({});

const PROJECTS_TABLE = process.env.PROJECTS_TABLE!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CF_KEY_PAIR_ID = process.env.CF_KEY_PAIR_ID || "";
const CF_PRIVATE_KEY = process.env.CF_PRIVATE_KEY!;
const URL_EXPIRES_IN_SECONDS = parseInt(
  process.env.URL_EXPIRES_IN_SECONDS || "86400",
  10
);

interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

interface ApiGatewayEvent {
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
}

function createResponse(statusCode: number, body: object): ApiGatewayResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

function buildCloudFrontUrl(key: string): string {
  try {
    const domain = CLOUDFRONT_DOMAIN.replace(/\/$/, "");
    const normalizedKey = key.replace(/^\/+/, "");
    const url = `https://${domain}/${normalizedKey}`;

    // Validate URL format
    new URL(url);
    return url;
  } catch (error) {
    throw new Error(
      `Invalid CloudFront URL construction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function signUrl(url: string, expires: number): string {
  if (!CF_KEY_PAIR_ID) {
    throw new Error("CF_KEY_PAIR_ID is not configured");
  }

  if (!CF_PRIVATE_KEY) {
    throw new Error("CF_PRIVATE_KEY is not configured");
  }

  try {
    const urlObj = new URL(url);
    // Extract path parts, filter out empty strings, and remove the filename
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    pathParts.pop(); // Remove the filename

    // Build resource URL with wildcard for directory access
    const resourcePath =
      pathParts.length > 0 ? `/${pathParts.join("/")}/*` : "/*";
    const resourceUrl = `${urlObj.protocol}//${urlObj.host}${resourcePath}`;

    // CloudFront requires compact JSON (no whitespace) - JSON.stringify by default produces compact JSON
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: resourceUrl,
          Effect: "Allow",
          Condition: {
            DateLessThan: { "AWS:EpochTime": expires },
          },
        },
      ],
    });

    let signature: string;
    try {
      signature = crypto
        .createSign("RSA-SHA1")
        .update(policy)
        .sign(CF_PRIVATE_KEY, "base64");
    } catch (error) {
      throw new Error(
        `Failed to sign policy: ${
          error instanceof Error ? error.message : "Unknown signing error"
        }`
      );
    }

    const policyBase64 = Buffer.from(policy).toString("base64");
    const signedUrl = `${url}?Policy=${encodeURIComponent(
      policyBase64
    )}&Signature=${encodeURIComponent(
      signature
    )}&Key-Pair-Id=${CF_KEY_PAIR_ID}`;

    // Log policy details for debugging (remove in production if needed)
    console.log("Signed URL generated:", {
      resourceUrl,
      expires,
      expiresDate: new Date(expires * 1000).toISOString(),
      keyPairId: CF_KEY_PAIR_ID,
      policyLength: policy.length,
    });

    return signedUrl;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Failed to sign policy")
    ) {
      throw error;
    }
    throw new Error(
      `Failed to generate signed URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function validateProject(apiKey: string): Promise<boolean> {
  try {
    const result = await db.send(
      new GetItemCommand({
        TableName: PROJECTS_TABLE,
        Key: { project_id: { S: apiKey } },
      })
    );
    return !!result.Item;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("DynamoDB error validating project:", {
      error: errorMessage,
      apiKey: apiKey.substring(0, 8) + "...", // Log partial key for debugging
    });
    throw new Error(`Failed to validate project: ${errorMessage}`);
  }
}

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  // Validate environment
  if (!PROJECTS_TABLE || !CLOUDFRONT_DOMAIN || !CF_PRIVATE_KEY) {
    console.error("Missing required environment variables");
    return createResponse(500, { error: "Internal server error" });
  }

  if (
    URL_EXPIRES_IN_SECONDS <= 0 ||
    !Number.isInteger(URL_EXPIRES_IN_SECONDS)
  ) {
    console.error("Invalid URL_EXPIRES_IN_SECONDS");
    return createResponse(500, { error: "Internal server error" });
  }

  // Extract and validate inputs
  const apiKey = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
  const key = event.queryStringParameters?.key;

  if (!apiKey) {
    return createResponse(401, { error: "Missing API key" });
  }

  if (!key || typeof key !== "string" || !key.trim()) {
    return createResponse(400, { error: "Missing or invalid key parameter" });
  }

  try {
    // Validate project
    let isValidProject: boolean;
    try {
      isValidProject = await validateProject(apiKey);
    } catch (error) {
      console.error("Project validation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        apiKey: apiKey.substring(0, 8) + "...",
      });
      return createResponse(500, { error: "Internal server error" });
    }

    if (!isValidProject) {
      return createResponse(403, { error: "Invalid API key" });
    }

    // Generate signed URL
    let signedUrl: string;
    let expires: number;
    try {
      const url = buildCloudFrontUrl(key);
      expires = Math.floor(Date.now() / 1000) + URL_EXPIRES_IN_SECONDS;
      signedUrl = signUrl(url, expires);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("URL signing failed:", {
        error: errorMessage,
        key: key.substring(0, 50),
      });
      return createResponse(500, { error: "Internal server error" });
    }

    return createResponse(200, {
      signedUrl,
      expiresAt: expires,
    });
  } catch (error) {
    console.error("Unexpected handler error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createResponse(500, { error: "Internal server error" });
  }
};
