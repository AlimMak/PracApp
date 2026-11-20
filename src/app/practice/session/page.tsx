import type { Metadata } from "next";
import SessionRunner from "@/components/session-runner";

export const metadata: Metadata = {
  title: "Mixed session · Interview Practice",
};

export default function Page() {
  return <SessionRunner />;
}
