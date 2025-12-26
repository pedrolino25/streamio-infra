import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "crypto";

const db = new DynamoDBClient({});

const PROJECTS_TABLE = process.env.PROJECTS_TABLE!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CF_KEY_PAIR_ID = process.env.CF_KEY_PAIR_ID!;
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

function json(statusCode: number, body: object): ApiGatewayResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

/**
 * Validate project API key
 */
async function validateProject(apiKey: string): Promise<boolean> {
  const result = await db.send(
    new GetItemCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: { S: apiKey } },
    })
  );
  return !!result.Item;
}

/**
 * Generate CloudFront signed cookies
 */
function generateSignedCookies(resourcePath: string, expires: number) {
  const resource = `https://${CLOUDFRONT_DOMAIN}${resourcePath}`;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Effect: "Allow",
        Condition: {
          DateLessThan: { "AWS:EpochTime": expires },
        },
      },
    ],
  });

  const privateKey = CF_PRIVATE_KEY.replace(/\\n/g, "\n");

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(policy)
    .sign(privateKey, "base64");

  return {
    "CloudFront-Policy": Buffer.from(policy).toString("base64"),
    "CloudFront-Signature": signature,
    "CloudFront-Key-Pair-Id": CF_KEY_PAIR_ID,
  };
}

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  const apiKey = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
  const projectPath = event.queryStringParameters?.key;

  if (!apiKey) {
    return json(401, { error: "Missing API key" });
  }

  if (!projectPath) {
    return json(400, { error: "Missing path parameter" });
  }

  const isValid = await validateProject(apiKey);
  if (!isValid) {
    return json(403, { error: "Invalid API key" });
  }

  const expires = Math.floor(Date.now() / 1000) + URL_EXPIRES_IN_SECONDS;

  /**
   * Example projectPath:
   * /projects/my-first-project/v/0/*
   */
  const cookies = generateSignedCookies(projectPath, expires);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Signed cookies issued",
      expiresAt: expires,
    }),
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": [
        `CloudFront-Policy=${cookies["CloudFront-Policy"]}; Path=/; Secure; HttpOnly; SameSite=None`,
        `CloudFront-Signature=${cookies["CloudFront-Signature"]}; Path=/; Secure; HttpOnly; SameSite=None`,
        `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}; Path=/; Secure; HttpOnly; SameSite=None`,
      ].join(", "),
    },
  };
};
