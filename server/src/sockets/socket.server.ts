import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { socketAuthMiddleware, AuthedSocket } from "./socket.auth";
import { canActorAccessProject } from "../services/project.service";
import { registerSocket, unregisterSocket, getOnlineUserCount } from "../services/presence.service";
import { getMissedActivity } from "../services/activity.service";
import { setIO } from "./activity.emitter";

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use(socketAuthMiddleware);
  setIO(io);

  io.on("connection", (socketRaw: Socket) => {
    const socket = socketRaw as AuthedSocket;
    const actor = socket.data.user;

    // Every connected user gets a personal room for direct events
    // (notification-count updates) without needing to know socket ids.
    socket.join(`user:${actor.id}`);

    const wentOnline = registerSocket(actor.id, socket.id);
    if (wentOnline) {
      io.to("presence:admins").emit("presence:update", { onlineCount: getOnlineUserCount() });
    }
    if (actor.role === "ADMIN") {
      socket.join("presence:admins");
      socket.emit("presence:update", { onlineCount: getOnlineUserCount() });
    }

    // CRITICAL security boundary: the server verifies authorization for the
    // requested project BEFORE joining the room. A developer sending
    // join_project("some-other-project-id") gets an error event, not
    // membership. There is no client-trusted "role" field involved.
    socket.on("join_project", async (projectId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
      const allowed = await canActorAccessProject(projectId, actor);
      if (!allowed) {
        ack?.({ ok: false, error: "FORBIDDEN" });
        return;
      }
      socket.join(`project:${projectId}`);
      ack?.({ ok: true });
    });

    socket.on("leave_project", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Missed-event recovery over the socket channel itself (in addition to
    // the REST endpoint GET /api/activity/missed) — always reads from
    // PostgreSQL, never an in-memory buffer, and applies the same
    // role/resource scoping as every other read path.
    socket.on("sync_missed_activity", async (lastSeenId: string | undefined, cb: (events: unknown[]) => void) => {
      const events = await getMissedActivity(actor, lastSeenId, 20);
      cb(events);
    });

    socket.on("disconnect", () => {
      const wentOffline = unregisterSocket(actor.id, socket.id);
      if (wentOffline) {
        io.to("presence:admins").emit("presence:update", { onlineCount: getOnlineUserCount() });
      }
    });
  });

  return io;
}
