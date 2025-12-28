import { PresignedPlayUrlHandler } from "./handlers/presigned-play-url.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./types";

const handlerInstance = new PresignedPlayUrlHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
