import type { Metadata } from "next";
import OfflineChat from "@/components/offline-chat";

export const metadata: Metadata = {
  title: "Offline chat · Interview Practice",
  description:
    "Design how a chat app delivers a message after its recipient reconnects.",
};

export default function OfflineChatPage() {
  return <OfflineChat />;
}
