import type { Metadata } from "next";
import AccountPage from "@/components/account-page";

export const metadata: Metadata = {
  title: "Practice account · Interview Practice",
};

export default function Page() {
  return <AccountPage />;
}
