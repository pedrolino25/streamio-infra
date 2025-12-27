import crypto from "crypto";

export class UrlSigner {
  constructor(
    private readonly cloudfrontDomain: string,
    private readonly keyPairId: string,
    private readonly privateKey: string
  ) {
    if (!cloudfrontDomain || !keyPairId || !privateKey) {
      throw new Error("UrlSigner: Missing required configuration");
    }
  }

  /**
   * Generates CloudFront signed URL query parameters with a wildcard policy.
   * The policy authorizes access to all files within the specified project folder.
   * 
   * @param projectId - The project ID to create a wildcard path for
   * @param expires - Unix timestamp (seconds) when the URL expires
   * @returns An object containing the base URL and query parameters that can be appended to any file path
   */
  sign(projectId: string, expires: number): { baseUrl: string; queryParams: string } {
    try {
      if (!projectId || typeof projectId !== "string") {
        throw new Error("Invalid projectId parameter");
      }
      if (!expires || typeof expires !== "number" || expires <= 0) {
        throw new Error("Invalid expiration timestamp");
      }

      // Create wildcard resource: https://cdn.stream-io.cloud/<project-id>/*
      const resource = `https://${this.cloudfrontDomain}/${projectId}/*`;
      const policy = this.createPolicy(resource, expires);
      const signature = this.createSignature(policy);

      // Build base URL and query parameters
      // Frontend can append any file path to baseUrl and add queryParams
      // Example: baseUrl + "/video.m3u8" + "?" + queryParams
      const baseUrl = `https://${this.cloudfrontDomain}/${projectId}`;
      const params = new URLSearchParams({
        "Policy": Buffer.from(policy).toString("base64url"),
        "Signature": signature,
        "Key-Pair-Id": this.keyPairId,
      });

      return {
        baseUrl,
        queryParams: params.toString(),
      };
    } catch (error) {
      console.error("URL signing error:", {
        error: error instanceof Error ? error.message : String(error),
        hasKeyPairId: !!this.keyPairId,
        hasPrivateKey: !!this.privateKey,
      });

      if (error instanceof Error && error.message.includes("Invalid")) {
        throw error;
      }

      throw new Error("Failed to generate signed URL");
    }
  }

  private createPolicy(resource: string, expires: number): string {
    return JSON.stringify({
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
  }

  private createSignature(policy: string): string {
    try {
      const privateKey = this.privateKey.replace(/\\n/g, "\n");
      return crypto
        .createSign("RSA-SHA256")
        .update(policy)
        .sign(privateKey, "base64url");
    } catch (error) {
      console.error("Signature creation error:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid private key or signing configuration");
    }
  }
}

