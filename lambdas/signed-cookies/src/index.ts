import { SignedCookiesHandler } from "./handlers/signed-cookies.handler";
import { ApiGatewayEvent, ApiGatewayResponse } from "./types";

const handlerInstance = new SignedCookiesHandler();

export const handler = async (
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> => {
  return handlerInstance.handle(event);
};
