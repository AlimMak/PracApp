"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { AccountSync, type SyncState } from "@/lib/account-sync";
import {
  activityPath,
  importReceipt,
  isPracticeKey,
  LOCATION_KEY,
  normalizeGuest,
  stableId,
  type Choices,
  type Records,
} from "@/lib/account-data";
import { FRESH_CHAT, CHAT_STORAGE_KEY } from "@/lib/chat-design";
import { FRESH_STATE, STORAGE_KEY } from "@/lib/lesson";
import { EMPTY_PLAN, PLAN_KEY } from "@/lib/practice-plan";
import { FRESH_STAR, STAR_STORAGE_KEY } from "@/lib/star";
import {
  accountsConfigured,
  createAccountClient,
  practiceRemote,
} from "@/lib/supabase-practice";
import { guestStorage, StorageContext } from "./practice-storage";

const QUIET: SyncState = {
  status: "synced",
  conflicts: [],
  source: null,
  generation: 0,
};
const SYNC_LABELS = {
  synced: "Practice synced",
  pending: "Unsynced changes",
  saving: "Syncing practice…",
  error: "Unsynced changes. Sync failed.",
  conflict: "Unsynced changes. Resolve a conflict to sync.",
};
const GUEST_ID = "interview-practice:guest-source:v1";

function guestRecords(): Records {
  const defaults: Records = {
    [CHAT_STORAGE_KEY]: JSON.stringify(FRESH_CHAT),
    [STORAGE_KEY]: JSON.stringify(FRESH_STATE),
    [PLAN_KEY]: JSON.stringify(EMPTY_PLAN),
    [STAR_STORAGE_KEY]: JSON.stringify(FRESH_STAR),
  };
  const records: Records = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !isPracticeKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value === null || value === defaults[key]) continue;
    if (key === LOCATION_KEY && !activityPath(value)) continue;
    records[key] = value;
  }
  if (Object.keys(records).every((key) => key === LOCATION_KEY)) return {};
  let id = localStorage.getItem(GUEST_ID);
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    id = stableId();
    localStorage.setItem(GUEST_ID, id);
  }
  return normalizeGuest(records, id);
}

type GuestOffer = { records: Records; receipt: string };
type AccountContextValue = {
  configured: boolean;
  client: SupabaseClient | null;
  session: Session | null;
  engine: AccountSync | null;
  sync: SyncState;
  offer: GuestOffer | null;
  loadError: boolean;
  retryLoad(): void;
  signOut(discard?: boolean): Promise<boolean>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function usePracticeAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("Practice account provider is missing");
  return value;
}

function ActivityLocation({ engine }: { engine: AccountSync | null }) {
  const path = usePathname();
  useEffect(() => {
    if (!activityPath(path)) return;
    try {
      (engine ?? guestStorage).setItem(LOCATION_KEY, path);
    } catch {
      /* Practice remains usable when local storage is blocked. */
    }
  }, [engine, path]);
  return null;
}

function versionText(value: unknown): string {
  if (value === undefined || value === null) return "Removed or empty.";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function ConflictReview({
  engine,
  sync,
}: {
  engine: AccountSync;
  sync: SyncState;
}) {
  const [choices, setChoices] = useState<Choices>({});
  const [saving, setSaving] = useState(false);
  const title =
    sync.source === "import"
      ? "Review guest import conflicts"
      : "Review changes from two devices";
  return (
    <main className="lesson-shell">
      <section className="practice-card">
        <h1>{title}</h1>
        <p>
          Choose the version to keep for each conflict. Other work is preserved.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              await engine.resolve(choices);
            } finally {
              setSaving(false);
            }
          }}
        >
          {sync.conflicts.map((item) => (
            <fieldset key={item.id} className="account-conflict">
              <legend>{item.label}</legend>
              <div className="account-versions">
                {(["account", "browser"] as const).map((side) => {
                  const label =
                    side === "account"
                      ? "Account version"
                      : sync.source === "import"
                        ? "Guest version"
                        : "This browser’s version";
                  return (
                    <div key={side}>
                      <label>
                        <input
                          type="radio"
                          name={item.id}
                          value={side}
                          checked={choices[item.id] === side}
                          onChange={() =>
                            setChoices((current) => ({
                              ...current,
                              [item.id]: side,
                            }))
                          }
                        />{" "}
                        {label}
                      </label>
                      <details>
                        <summary>View {label.toLowerCase()}</summary>
                        <pre>{versionText(item[side])}</pre>
                      </details>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="actions">
            <button
              className="button primary"
              disabled={
                saving || sync.conflicts.some((item) => !choices[item.id])
              }
            >
              Save chosen versions
            </button>
            {sync.source === "import" && (
              <button
                type="button"
                className="button secondary"
                onClick={() => engine.cancelImport()}
              >
                Cancel import
              </button>
            )}
          </div>
        </form>
        <p>
          <Link href="/account">Account options</Link>
        </p>
      </section>
    </main>
  );
}

export default function PracticeAccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [ready, setReady] = useState(!accountsConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [binding, setBinding] = useState<{
    user: string;
    engine: AccountSync;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [request, setRequest] = useState(0);
  const [offer, setOffer] = useState<GuestOffer | null>(null);
  const [sync, setSync] = useState(QUIET);
  const [signingOut, setSigningOut] = useState(false);
  const path = usePathname();
  const user = session?.user.id;
  const engine = user && binding?.user === user ? binding.engine : null;
  const loadError = !!user && failure === user;
  const live = useRef<AccountSync | null>(null);
  const identity = useRef<string | null>(null);

  useEffect(() => {
    if (!accountsConfigured) return;
    try {
      const connection = createAccountClient();
      if (!connection) {
        setReady(true);
        return;
      }
      setClient(connection);
      const { data } = connection.auth.onAuthStateChange((_event, current) => {
        const next = current?.user.id ?? null;
        if (identity.current !== next) {
          live.current?.close();
          live.current = null;
          identity.current = next;
          setBinding(null);
          setFailure(null);
          setOffer(null);
          setSync(QUIET);
        }
        setSession(current);
        setReady(true);
      });
      return () => data.subscription.unsubscribe();
    } catch {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!client || !user) return;
    let stopped = false;
    let created: AccountSync | null = null;
    const remote = practiceRemote(client, user);
    remote
      .load()
      .then((initial) => {
        if (stopped || identity.current !== user) return;
        created = new AccountSync(remote, initial, setSync);
        live.current = created;
        setBinding({ user, engine: created });
        setSync(QUIET);
        try {
          const records = guestRecords();
          if (Object.keys(records).length)
            void importReceipt(records)
              .then((receipt) => {
                if (!stopped && identity.current === user)
                  setOffer({ records, receipt });
              })
              .catch(() => {});
        } catch {
          /* Guest data can be unavailable on this browser. */
        }
      })
      .catch(() => {
        if (!stopped && identity.current === user) setFailure(user);
      });
    return () => {
      stopped = true;
      created?.close();
      if (live.current === created) live.current = null;
    };
  }, [client, user, request]);

  useEffect(() => {
    if (!engine) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (engine?.hasUnsynced()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function reconnect() {
      void engine?.sync();
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", reconnect);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", reconnect);
    };
  }, [engine]);

  async function signOut(discard = false) {
    if (!client) return false;
    if (!discard && engine?.hasUnsynced() && !(await engine.sync()))
      return false;
    setSigningOut(true);
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      return !error;
    } catch {
      return false;
    } finally {
      setSigningOut(false);
    }
  }

  const value = {
    configured: accountsConfigured,
    client,
    session,
    engine,
    sync,
    offer,
    loadError,
    retryLoad() {
      setFailure(null);
      setRequest((count) => count + 1);
    },
    signOut,
  };
  const pendingAccount =
    !ready || signingOut || (!!user && !engine && !loadError);
  return (
    <AccountContext.Provider value={value}>
      {engine && (
        <aside className="account-bar" aria-label="Account sync">
          <span role="status">{SYNC_LABELS[sync.status]}</span>
          {sync.status === "error" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => void engine.sync()}
            >
              Retry sync
            </button>
          )}
          {offer &&
            !engine.hasImported(offer.receipt) &&
            path !== "/account" && (
              <Link href="/account">Import guest practice</Link>
            )}
          <Link href="/account">Account</Link>
        </aside>
      )}
      {pendingAccount ? (
        <main className="lesson-shell">
          <p role="status">Opening practice…</p>
        </main>
      ) : loadError && path !== "/account" ? (
        <main className="lesson-shell">
          <p>Account practice could not be loaded.</p>
          <Link href="/account">Account options</Link>
        </main>
      ) : engine && sync.status === "conflict" && path !== "/account" ? (
        <ConflictReview engine={engine} sync={sync} />
      ) : (
        <StorageContext.Provider value={engine ?? guestStorage}>
          <ActivityLocation engine={engine} />
          <Fragment key={(user ?? "guest") + ":" + sync.generation}>
            {children}
          </Fragment>
        </StorageContext.Provider>
      )}
      {!user && !pendingAccount && path !== "/account" && (
        <footer className="account-footer">
          <Link href="/account">Practice account</Link>
        </footer>
      )}
      {engine && sync.status === "conflict" && path === "/account" && (
        <ConflictReview engine={engine} sync={sync} />
      )}
    </AccountContext.Provider>
  );
}
