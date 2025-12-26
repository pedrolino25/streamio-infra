import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
  "image/tif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/x-png",
  "image/apng",
  "image/avif",
  "image/heic",
  "image/heif",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/webm",
  "video/ogg",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
  "video/x-flv",
  "video/x-m4v",
  "video/mp2t",
  "video/x-ms-asf",
  "video/x-ms-wm",
  "video/x-ms-wmx",
  "video/x-ms-wvx",
  "video/avi",
];

const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const ALLOWED_FILE_TYPES_SET = new Set(ALLOWED_FILE_TYPES);

const s3 = new S3Client({});
const db = new DynamoDBClient({});

const RAW_BUCKET = process.env.RAW_BUCKET!;
const PROJECTS_TABLE = process.env.PROJECTS_TABLE!;
const UPLOAD_URL_EXPIRES_IN = 300; // 5 minutes

interface RequestBody {
  filename: string;
  path: string;
  contentType: string;
}

interface ApiGatewayResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
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

function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeContentType(contentType: string): string {
  return contentType.toLowerCase().trim();
}

function isValidFileType(contentType: string): boolean {
  const normalized = normalizeContentType(contentType);
  return ALLOWED_FILE_TYPES_SET.has(normalized);
}

function getProjectIdentifier(projectId: string, projectName?: string): string {
  if (projectName) {
    const sanitized = sanitizeProjectName(projectName);
    return sanitized || projectId;
  }
  return projectId;
}

async function validateProject(apiKey: string) {
  const result = await db.send(
    new GetItemCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: { S: apiKey } },
    })
  );

  if (!result.Item) {
    return null;
  }

  return {
    projectId: result.Item.project_id.S!,
    projectName: result.Item.project_name?.S,
  };
}

function validateRequestBody(body: any): RequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const { filename, path, contentType } = body;

  if (
    !filename ||
    typeof filename !== "string" ||
    filename.trim().length === 0
  ) {
    throw new Error("Filename is required and must be a non-empty string");
  }

  const normalizedPath = path && typeof path === "string" ? path : "";

  if (!contentType || typeof contentType !== "string") {
    throw new Error("Content-Type is required");
  }

  const normalizedContentType = normalizeContentType(contentType);
  if (!isValidFileType(normalizedContentType)) {
    throw new Error(
      `File type "${contentType}" is not allowed. Allowed types: images and videos (${ALLOWED_FILE_TYPES.length} types supported)`
    );
  }

  return {
    filename: filename.trim(),
    path: normalizedPath.trim(),
    contentType: normalizedContentType,
  };
}

function buildS3Key(
  projectIdentifier: string,
  filePath: string,
  filename: string
): string {
  const normalizedPath = filePath.replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes
  const pathPrefix = normalizedPath ? `${normalizedPath}/` : "";
  return `projects/${projectIdentifier}/${pathPrefix}${filename}`;
}

export const handler = async (event: any): Promise<ApiGatewayResponse> => {
  try {
    const apiKey = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
    if (!apiKey) {
      return createResponse(401, "Missing API key");
    }

    let requestBody: RequestBody;
    try {
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      requestBody = validateRequestBody(body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid request body";
      return createResponse(400, { error: message });
    }

    const project = await validateProject(apiKey);
    if (!project) {
      return createResponse(403, "Invalid API key");
    }

    const projectIdentifier = getProjectIdentifier(
      project.projectId,
      project.projectName
    );
    const s3Key = buildS3Key(
      projectIdentifier,
      requestBody.path,
      requestBody.filename
    );

    const command = new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: s3Key,
      ContentType: requestBody.contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: UPLOAD_URL_EXPIRES_IN,
    });

    return createResponse(200, {
      uploadUrl,
      s3Key,
    });
  } catch (error) {
    console.error("Upload URL generation error:", error);
    return createResponse(500, {
      error: "Internal server error",
    });
  }
};
