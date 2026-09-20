# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Command protocol upgrade

This version includes a visual/game-feel polish pass focused on combat feedback and mobile presentation:

- floating damage and reward numbers
- expanding impact/fusion shockwaves
- stronger hit, death and boss effects
- subtle screen shake for major impacts
- wave-intro banner
- improved selected-tower feedback
- stronger muzzle/projectile feedback
- slightly more spacious mobile HUD cards
- particle drag and richer particle bursts

The core game architecture and existing mechanics were preserved and extended with:

- capped visual-effect pools for stable low-end Android frame times
- explicit run results, session statistics, safe best-wave persistence and a manual restart flow
- safe background-tab pause behavior, sound toggle, synthesized zero-asset combat SFX
- responsive safe-area-aware mobile/landscape controls and clearer touch targets
- an honest 1v1 lobby and network contract; it never pretends a bot is online. See [MULTIPLAYER.md](MULTIPLAYER.md) for the required authoritative backend configuration.
