import { handleAlbumApi } from "../server/album-api.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  return handleAlbumApi(request, response);
}
