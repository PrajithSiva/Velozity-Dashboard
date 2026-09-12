import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "../api/client";
import { ActivityEvent } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";


export function useSocket(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const lastSeenId = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      
      socket.emit("sync_missed_activity", lastSeenId.current, (missed: ActivityEvent[]) => {
        if (missed.length) {
          setActivity((prev) => [...missed, ...prev].slice(0, 100));
          lastSeenId.current = missed[0]?.id ?? lastSeenId.current;
        }
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("activity:new", (event: ActivityEvent) => {
      setActivity((prev) => [event, ...prev].slice(0, 100));
      lastSeenId.current = event.id;
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("notification:count_changed", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });

    socket.on("presence:update", (payload: { onlineCount: number }) => {
      setOnlineCount(payload.onlineCount);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, queryClient]);

  function joinProject(projectId: string) {
    socketRef.current?.emit("join_project", projectId, (res: { ok: boolean }) => {
      if (!res.ok) console.warn("Not authorized to join project room", projectId);
    });
  }

  function leaveProject(projectId: string) {
    socketRef.current?.emit("leave_project", projectId);
  }

  return { connected, activity, onlineCount, joinProject, leaveProject };
}
