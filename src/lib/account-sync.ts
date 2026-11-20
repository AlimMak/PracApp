import {
  EMPTY_SNAPSHOT,
  isPracticeKey,
  mergeRecords,
  restoreSnapshot,
  type Choices,
  type Conflict,
  type Records,
  type Snapshot,
} from "./account-data.ts";

export type PracticeStorage = Pick<Storage, "getItem" | "setItem">;
export type RemoteVersion = { revision: number; payload: Snapshot };
export type AccountRemote = {
  load(): Promise<RemoteVersion>;
  save(expected: number, payload: Snapshot): Promise<number | null>;
};
type PendingMerge =
  | { kind: "sync"; remote: RemoteVersion }
  | { kind: "import"; records: Records; receipt: string };

export type SyncState = {
  status: "synced" | "pending" | "saving" | "error" | "conflict";
  conflicts: Conflict[];
  source: "sync" | "import" | null;
  generation: number;
};

export class AccountSync implements PracticeStorage {
  private remote: AccountRemote;
  private notify: (state: SyncState) => void;
  private base: RemoteVersion;
  private local: Snapshot;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<boolean> | undefined;
  private merge: PendingMerge | null = null;
  private closed = false;
  private state: SyncState = {
    status: "synced",
    conflicts: [],
    source: null,
    generation: 0,
  };

  constructor(
    remote: AccountRemote,
    initial: RemoteVersion,
    notify: (state: SyncState) => void,
  ) {
    this.remote = remote;
    this.notify = notify;
    this.base = initial;
    this.local = initial.payload;
  }

  getItem(key: string) {
    return this.local.records[key] ?? null;
  }

  setItem(key: string, value: string) {
    if (this.closed || !isPracticeKey(key) || this.getItem(key) === value)
      return;
    this.local = {
      ...this.local,
      records: { ...this.local.records, [key]: value },
    };
    if (this.merge) return;
    this.publish("pending");
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), 450);
  }

  private publish(
    status: SyncState["status"],
    conflicts: Conflict[] = [],
    changed = false,
  ) {
    if (this.closed) return;
    this.state = {
      status,
      conflicts,
      source: this.merge?.kind ?? null,
      generation: this.state.generation + Number(changed),
    };
    this.notify(this.state);
  }

  hasUnsynced() {
    return this.merge !== null || this.local !== this.base.payload;
  }

  hasImported(receipt: string) {
    return this.base.payload.imports.includes(receipt);
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.merge = null;
    this.base = { revision: 0, payload: EMPTY_SNAPSHOT };
    this.local = EMPTY_SNAPSHOT;
  }

  sync(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.closed || this.merge) return Promise.resolve(false);
    if (this.inFlight) return this.inFlight;
    const promise = this.flush().finally(() => {
      this.inFlight = undefined;
    });
    this.inFlight = promise;
    return promise;
  }

  private async flush(): Promise<boolean> {
    try {
      // A retry is needed only if a second browser changed the revision, or
      // if the learner typed while the previous request was in flight.
      for (
        let attempt = 0;
        !this.closed && this.local !== this.base.payload && attempt < 6;
        attempt++
      ) {
        this.publish("saving");
        const payload = this.local;
        const nextRevision = await this.remote.save(
          this.base.revision,
          payload,
        );
        if (this.closed) return false;
        if (nextRevision !== null) {
          this.base = { revision: nextRevision, payload };
          continue;
        }
        const remote = await this.remote.load();
        if (this.closed) return false;
        this.merge = { kind: "sync", remote };
        if (!this.applyMerge({})) return false;
      }
      const saved = !this.closed && this.local === this.base.payload;
      this.publish(saved ? "synced" : "error");
      return saved;
    } catch {
      this.publish("error");
      return false;
    }
  }

  async importGuest(records: Records, receipt: string) {
    if (!(await this.sync()) || this.closed) return;
    if (this.hasImported(receipt)) return;
    this.merge = { kind: "import", records, receipt };
    if (this.applyMerge({})) await this.sync();
  }

  async resolve(choices: Choices) {
    if (this.applyMerge(choices)) await this.sync();
  }

  cancelImport() {
    if (this.merge?.kind !== "import") return;
    this.merge = null;
    if (this.hasUnsynced()) {
      this.publish("pending");
      this.schedule();
    } else this.publish("synced");
  }

  private applyMerge(choices: Choices): boolean {
    const merge = this.merge;
    if (!merge || this.closed) return false;
    const result =
      merge.kind === "sync"
        ? mergeRecords(
            this.base.payload.records,
            this.local.records,
            merge.remote.payload.records,
            choices,
          )
        : mergeRecords({}, merge.records, this.local.records, choices);
    if (result.conflicts.length) {
      this.publish("conflict", result.conflicts);
      return false;
    }
    const imports =
      merge.kind === "sync"
        ? [...new Set([...this.local.imports, ...merge.remote.payload.imports])]
        : [...new Set([...this.local.imports, merge.receipt])];
    const changed =
      JSON.stringify(this.local.records) !== JSON.stringify(result.records);
    if (merge.kind === "sync") this.base = merge.remote;
    const combined = restoreSnapshot({ records: result.records, imports });
    this.local =
      JSON.stringify(combined) === JSON.stringify(this.base.payload)
        ? this.base.payload
        : combined;
    this.merge = null;
    this.publish(this.hasUnsynced() ? "pending" : "synced", [], changed);
    return true;
  }
}
