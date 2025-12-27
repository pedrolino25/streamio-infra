import { UploadHandler } from "./handlers/upload.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./types";

const handlerInstance = new UploadHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
