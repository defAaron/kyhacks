import type { Metadata } from "next";
import { ExploreBoard } from "@/components/explore/ExploreBoard";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Browse available surplus food near Louisville on a map and list.",
};

export default function ExplorePage() {
  return (
    <main>
      <ExploreBoard />
    </main>
  );
}
