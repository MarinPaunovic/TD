import { createFileRoute } from "@tanstack/react-router";
import { TowerDefenseGame } from "../components/TowerDefenseGame";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Tower Defense" },
      { name: "description", content: "A fast tower defense game." },
      { property: "og:title", content: "Tower Defense" },
      { property: "og:description", content: "A fast tower defense game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  return <TowerDefenseGame />;
}
