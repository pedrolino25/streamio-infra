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

interface SignedUrlResponse {
  signedUrl: string;
  expiresAt: number;
}

function createResponse(
  statusCode: number,
  body: string | object
): ApiGatewayResponse {
  return {
    statusCode,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

function validateEnvironment(): void {
  const required = {
    PROJECTS_TABLE,
    CLOUDFRONT_DOMAIN,
    CF_PRIVATE_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (
    URL_EXPIRES_IN_SECONDS <= 0 ||
    !Number.isInteger(URL_EXPIRES_IN_SECONDS)
  ) {
    throw new Error("URL_EXPIRES_IN_SECONDS must be a positive integer");
  }
}

function validateS3Key(key: string): void {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    throw new Error("Key parameter is required and must be a non-empty string");
  }
}

function buildCloudFrontUrl(key: string): string {
  const domain = CLOUDFRONT_DOMAIN.replace(/\/$/, "");
  const normalizedKey = key.replace(/^\/+/, "");
  return `https://${domain}/${normalizedKey}`;
}

function signUrl(url: string, expires: number): string {
  if (!CF_KEY_PAIR_ID) {
    throw new Error("CF_KEY_PAIR_ID is not configured");
  }

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: url,
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
    const message =
      error instanceof Error ? error.message : "Unknown signing error";
    throw new Error(`Failed to sign URL: ${message}`);
  }

  const policyBase64 = Buffer.from(policy).toString("base64");
  return `${url}?Policy=${encodeURIComponent(
    policyBase64
  )}&Signature=${encodeURIComponent(signature)}&Key-Pair-Id=${CF_KEY_PAIR_ID}`;
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
    console.error("Error validating project:", error);
    throw error;
  }
}

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  try {
    validateEnvironment();
  } catch (error) {
    console.error("Environment validation failed:", error);
    return createResponse(500, {
      error: "Internal server error",
    });
  }

  try {
    const apiKey = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
    const key = event.queryStringParameters?.key;

    if (!apiKey) {
      return createResponse(401, { error: "Missing API key" });
    }

    if (!key) {
      return createResponse(400, { error: "Missing key parameter" });
    }

    try {
      validateS3Key(key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid key parameter";
      return createResponse(400, { error: message });
    }

    const isValidProject = await validateProject(apiKey);
    if (!isValidProject) {
      return createResponse(403, { error: "Invalid API key" });
    }

    const url = buildCloudFrontUrl(key);
    const expires = Math.floor(Date.now() / 1000) + URL_EXPIRES_IN_SECONDS;

    let signedUrl: string;
    try {
      signedUrl = signUrl(url, expires);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate signed URL";
      console.error("URL signing error:", message);
      return createResponse(500, { error: "Internal server error" });
    }

    const response: SignedUrlResponse = {
      signedUrl,
      expiresAt: expires,
    };

    console.log(
      `Successfully generated signed URL for key: ${key.substring(0, 50)}`
    );

    return createResponse(200, response);
  } catch (error) {
    console.error("Handler error:", error);
    return createResponse(500, {
      error: "Internal server error",
    });
  }
};
