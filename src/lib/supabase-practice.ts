import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_SNAPSHOT, restoreSnapshot } from "./account-data";
import type { AccountRemote } from "./account-sync";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const accountsConfigured = Boolean(url && key);

export function createAccountClient() {
  return url && key ? createClient(url, key) : null;
}

export function practiceRemote(
  client: SupabaseClient,
  userId: string,
): AccountRemote {
  return {
    async load() {
      const { data, error } = await client
        .from("practice_accounts")
        .select("revision,payload")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? { revision: data.revision, payload: restoreSnapshot(data.payload) }
        : { revision: 0, payload: EMPTY_SNAPSHOT };
    },
    async save(expected, payload) {
      const { data, error } = await client.rpc("save_practice_account", {
        expected_owner: userId,
        expected_revision: expected,
        next_payload: payload,
      });
      if (error) throw error;
      if (data !== null && (!Number.isSafeInteger(data) || data <= expected))
        throw new Error("Invalid revision");
      return data;
    },
  };
}
