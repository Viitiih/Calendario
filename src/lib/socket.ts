import { io, Socket } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const isSocketEnabled = !Boolean(import.meta.env.VITE_STATIC_MODE) && (import.meta.env.DEV || Boolean(BACKEND_URL));

const socket = isSocketEnabled ? io(BACKEND_URL || window.location.origin, {
  transports: ["websocket"],
  reconnection: false,
  timeout: 10000,
  path: "/socket.io",
}) : {
  emit: () => {},
  on: () => {},
  off: () => {},
} as unknown as Socket;

export default socket;
