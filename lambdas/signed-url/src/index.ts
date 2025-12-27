import { SignedUrlHandler } from "./handlers/signed-url.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./types";

const handlerInstance = new SignedUrlHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
