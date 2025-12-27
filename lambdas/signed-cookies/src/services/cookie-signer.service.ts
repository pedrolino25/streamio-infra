import crypto from "crypto";
import { SignedCookies } from "../types";

export class CookieSigner {
  constructor(
    private readonly cloudfrontDomain: string,
    private readonly keyPairId: string,
    private readonly privateKey: string
  ) {
    if (!cloudfrontDomain || !keyPairId || !privateKey) {
      throw new Error("CookieSigner: Missing required configuration");
    }
  }

  sign(path: string, expires: number): SignedCookies {
    try {
      if (!path || typeof path !== "string") {
        throw new Error("Invalid path parameter");
      }
      if (!expires || typeof expires !== "number" || expires <= 0) {
        throw new Error("Invalid expiration timestamp");
      }

      const resource = `https://${this.cloudfrontDomain}${path}`;
      const policy = this.createPolicy(resource, expires);
      const signature = this.createSignature(policy);

      return {
        "CloudFront-Policy": Buffer.from(policy).toString("base64"),
        "CloudFront-Signature": signature,
        "CloudFront-Key-Pair-Id": this.keyPairId,
      };
    } catch (error) {
      console.error("Cookie signing error:", {
        error: error instanceof Error ? error.message : String(error),
        hasKeyPairId: !!this.keyPairId,
        hasPrivateKey: !!this.privateKey,
      });

      if (error instanceof Error && error.message.includes("Invalid")) {
        throw error;
      }

      throw new Error("Failed to generate signed cookies");
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
        .sign(privateKey, "base64");
    } catch (error) {
      console.error("Signature creation error:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid private key or signing configuration");
    }
  }
}
