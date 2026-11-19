import type { Metadata } from "next";
import StarLesson from "@/components/star-lesson";

export const metadata: Metadata = {
  title: "STAR stories · Interview Practice",
  description:
    "Build a story from your own experience and rehearse it for a behavioral interview.",
};

export default function StarPage() {
  return <StarLesson />;
}
