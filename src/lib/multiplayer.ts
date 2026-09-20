/**
 * Transport boundary for real 1v1. The shipped client intentionally has no
 * fake opponent: a server must authoritatively relay these snapshots/events.
 */
export interface MultiplayerSnapshot {
  wave: number;
  lives: number;
  gold: number;
  kills: number;
  bossKills: number;
  sentAt: number;
}
export interface MultiplayerTransport {
  connect(roomCode: string): Promise<void>;
  sendSnapshot(snapshot: MultiplayerSnapshot): void;
  sendPressure(kind: "runner" | "tank" | "drone"): void;
  disconnect(): void;
}

export const multiplayerConfigured = () => Boolean(import.meta.env["VITE_MULTIPLAYER_URL"]);
export const normalizeRoomCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
