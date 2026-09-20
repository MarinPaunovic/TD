# Multiplayer readiness

The game includes a deliberately honest multiplayer boundary in `src/lib/multiplayer.ts` and an in-game lobby entry point. A match is **not** simulated when no backend exists.

To make 1v1 live, deploy an authoritative WebSocket service and provide `VITE_MULTIPLAYER_URL=wss://your-service.example`. The service must authenticate room members, create/join six-character room codes, relay `MultiplayerSnapshot` state, relay validated pressure events, report disconnects, and decide the winner. Do not trust gold, damage, or win claims from clients: the recommended production design has the server own the random seed/wave schedule and validates every player action.

No credentials are stored in this repository. Until that service is configured, the lobby remains a clear configuration notice and single player is fully available.
