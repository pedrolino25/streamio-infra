import busboy from "busboy";
import { UploadData } from "../types";

/**
 * Parses multipart/form-data from API Gateway event
 * API Gateway with AWS_PROXY integration passes multipart data as a string in the body
 */
export class MultipartParser {
  static async parse(
    eventBody: string | object | undefined,
    contentType: string | undefined,
    isBase64Encoded: boolean | undefined
  ): Promise<UploadData | null> {
    if (!eventBody || typeof eventBody !== "string") {
      return null;
    }

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return null;
    }

    return new Promise((resolve, reject) => {
      try {
        const bodyBuffer = isBase64Encoded
          ? Buffer.from(eventBody, "base64")
          : Buffer.from(eventBody, "utf8");

        const bb = busboy({ headers: { "content-type": contentType } });
        const fields: Record<string, string> = {};
        let fileData: UploadData | null = null;
        let fileProcessed = false;

        bb.on("file", (name, file, info) => {
          if (name === "file") {
            const { filename, mimeType } = info;
            const chunks: Buffer[] = [];

            file.on("data", (data) => {
              chunks.push(data);
            });

            file.on("end", () => {
              fileData = {
                filename: filename || "upload",
                path: fields.path,
                contentType: mimeType || "application/octet-stream",
                fileBuffer: Buffer.concat(chunks),
              };
              fileProcessed = true;
            });

            file.on("error", (err) => {
              reject(new Error(`File read error: ${err.message}`));
            });
          } else {
            // Skip other files
            file.resume();
          }
        });

        bb.on("field", (name, value) => {
          fields[name] = value;
          // Update path in fileData if it was already processed
          if (name === "path" && fileData) {
            fileData.path = value;
          }
        });

        bb.on("finish", () => {
          if (fileProcessed && fileData) {
            resolve(fileData);
          } else {
            resolve(null);
          }
        });

        bb.on("error", (err) => {
          reject(new Error(`Multipart parse error: ${err.message}`));
        });

        // Write the body buffer to busboy
        bb.end(bodyBuffer);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to parse multipart data")
        );
      }
    });
  }
}
