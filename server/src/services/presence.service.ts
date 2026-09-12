// Tracks presence by USER, not by socket. A user can have many sockets
// (multiple tabs/devices); the online count must reflect unique users, so
// we keep a userId -> Set<socketId> map and only flip a user's presence
// when their LAST socket disconnects.
const userSockets = new Map<string, Set<string>>();

export function registerSocket(userId: string, socketId: string): boolean {
  const wasOffline = !userSockets.has(userId) || userSockets.get(userId)!.size === 0;
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socketId);
  return wasOffline; // true if this transitioned the user online -> notify
}

export function unregisterSocket(userId: string, socketId: string): boolean {
  const set = userSockets.get(userId);
  if (!set) return false;
  set.delete(socketId);
  const wentOffline = set.size === 0;
  if (wentOffline) userSockets.delete(userId);
  return wentOffline; // true if this transitioned the user online -> offline
}

export function getOnlineUserCount(): number {
  return userSockets.size;
}

export function getOnlineUserIds(): string[] {
  return Array.from(userSockets.keys());
}
