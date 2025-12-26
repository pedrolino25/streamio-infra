import { UploadUrlHandler } from "./handlers/upload-url.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./types";

const handlerInstance = new UploadUrlHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
