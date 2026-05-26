import { API_URL } from "./api-url.constant";

// API_URL is http(s)://... — convert to ws(s)://... for the WebSocket endpoint.
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/predict/ws`;
