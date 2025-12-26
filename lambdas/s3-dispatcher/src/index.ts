import { S3DispatcherHandler } from "./handlers/s3-dispatcher.handler";
import { S3Event } from "./types";

const handlerInstance = new S3DispatcherHandler();

export const handler = async (event: S3Event): Promise<void> => {
  try {
    await handlerInstance.handle(event);
  } catch (error) {
    console.error("S3 dispatcher error:", error);
    throw error;
  }
};
