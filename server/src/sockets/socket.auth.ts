import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { verifyAccessToken } from "../utils/jwt";
import { Role } from "@prisma/client";

export interface AuthedSocket extends Socket {
  data: {
    user: { id: string; role: Role };
  };
}

// Socket.io middleware: a client must present the SAME access JWT used for
// REST calls (sent via the `auth` handshake payload, not a cookie/query
// param a client could forge). No anonymous connections are allowed to
// reach any protected event — this runs before any listener is registered.
export function socketAuthMiddleware(socket: Socket, next: (err?: ExtendedError) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("UNAUTHENTICATED: missing token"));
  try {
    const payload = verifyAccessToken(token);
    (socket as AuthedSocket).data.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new Error("UNAUTHENTICATED: invalid token"));
  }
}
