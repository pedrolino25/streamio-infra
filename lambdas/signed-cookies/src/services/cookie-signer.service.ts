import crypto from "crypto";
import { SignedCookies } from "../types";

export class CookieSigner {
  constructor(
    private readonly cloudfrontDomain: string,
    private readonly keyPairId: string,
    private readonly privateKey: string
  ) {}

  sign(path: string, expires: number): SignedCookies {
    try {
      const resource = `https://${this.cloudfrontDomain}${path}`;
      const policy = this.createPolicy(resource, expires);
      const signature = this.createSignature(policy);

      return {
        "CloudFront-Policy": Buffer.from(policy).toString("base64"),
        "CloudFront-Signature": signature,
        "CloudFront-Key-Pair-Id": this.keyPairId,
      };
    } catch (error) {
      throw new Error(
        `Failed to sign cookies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
    const privateKey = this.privateKey.replace(/\\n/g, "\n");
    return crypto
      .createSign("RSA-SHA256")
      .update(policy)
      .sign(privateKey, "base64");
  }
}
