import { ApiGatewayEvent, ApiGatewayResponse } from "./src/types";
import { UploadUrlHandler } from "./src/handlers/upload-url.handler";

const handlerInstance = new UploadUrlHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
