import type { Metadata } from "next";
import PracticeDashboard from "@/components/practice-dashboard";

export const metadata: Metadata = {
  title: "Activities and progress · Interview Practice",
};

export default function Page() {
  return <PracticeDashboard />;
}
