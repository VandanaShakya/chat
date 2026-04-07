import { io } from "socket.io-client";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_BASE_URL?.replace(/\/api\/?$/, "");

const socket = io(socketUrl, {
  withCredentials: true,
});

export default socket;