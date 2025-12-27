import crypto from "crypto";

export class UrlSigner {
  constructor(
    private readonly cloudfrontDomain: string, // Domain for both policy and baseUrl
    private readonly keyPairId: string,
    private readonly privateKey: string
  ) {
    if (!cloudfrontDomain || !keyPairId || !privateKey) {
      throw new Error("UrlSigner: Missing required configuration");
    }
  }

  sign(
    projectId: string,
    expires: number
  ): { baseUrl: string; queryParams: string } {
    try {
      if (!projectId || typeof projectId !== "string") {
        throw new Error("Invalid projectId parameter");
      }
      if (!expires || typeof expires !== "number" || expires <= 0) {
        throw new Error("Invalid expiration timestamp");
      }

      const resource = `https://${this.cloudfrontDomain}/${projectId}/*`;
      const policy = this.createPolicy(resource, expires);
      const signature = this.createSignature(policy);

      const baseUrl = `https://${this.cloudfrontDomain}/${projectId}`;

      const policyBase64 = Buffer.from(policy)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "~")
        .replace(/=/g, "_");

      const queryParams = `Policy=${policyBase64}&Signature=${signature}&Key-Pair-Id=${encodeURIComponent(
        this.keyPairId
      )}`;

      return {
        baseUrl,
        queryParams,
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
    return JSON.stringify(
      {
        Statement: [
          {
            Resource: resource,
            Effect: "Allow",
            Condition: {
              DateLessThan: { "AWS:EpochTime": expires },
            },
          },
        ],
      },
      null,
      0
    );
  }

  private createSignature(policy: string): string {
    try {
      const privateKey = this.privateKey.replace(/\\n/g, "\n");

      const signatureBase64 = crypto
        .createSign("RSA-SHA256")
        .update(policy)
        .sign(privateKey, "base64");

      return signatureBase64
        .replace(/\+/g, "-")
        .replace(/\//g, "~")
        .replace(/=/g, "_");
    } catch (error) {
      console.error("Signature creation error:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid private key or signing configuration");
    }
  }
}
