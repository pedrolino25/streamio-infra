import { PlaybackUrlHandler } from "./src/handlers/playback-url.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./src/types";

const handlerInstance = new PlaybackUrlHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
