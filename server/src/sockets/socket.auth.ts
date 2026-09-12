import { Socket } from "socket.io";
import { ExtendedError } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { Role } from "@prisma/client";

export interface AuthedSocket extends Socket {
  data: {
    user: { id: string; role: Role };
  };
}


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
