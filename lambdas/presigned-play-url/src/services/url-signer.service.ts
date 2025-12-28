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

  sign(
    projectId: string,
    expires: number
  ): { baseUrl: string; queryParams: string } {
    if (!projectId || typeof projectId !== "string") {
      throw new Error("Invalid projectId parameter");
    }
    if (!expires || typeof expires !== "number" || expires <= 0) {
      throw new Error("Invalid expiration timestamp");
    }

    const resource = `https://${this.cloudfrontDomain}/${projectId}/*`;
    const policy = this.createPolicy(resource, expires);

    const policyBase64 = Buffer.from(policy)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "~")
      .replace(/=/g, "_");

    const signature = this.createSignature(policy);

    const baseUrl = `https://${this.cloudfrontDomain}/${projectId}`;

    const queryParams =
      `Policy=${policyBase64}` +
      `&Signature=${signature}` +
      `&Key-Pair-Id=${this.keyPairId}`;

    return {
      baseUrl,
      queryParams,
    };
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

    const signatureBase64 = crypto
      .createSign("RSA-SHA1")
      .update(policy)
      .sign(privateKey, "base64");

    return signatureBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "~")
      .replace(/=/g, "_");
  }
}
