import Dexie, { Table, Transaction } from "dexie";
import { toEpochMs } from "../core/util/time";

export type UUID = string;
export type ISO8601 = string;

export type ItemState = "fresh" | "fading" | "critical" | "archived" | "dead";

export interface TabDeathItem {
  id: UUID;
  url: string;
  title: string;
  domain: string;
  why: string | null;
  createdAt: ISO8601;
  lastTouchedAt: ISO8601 | null;
  state: ItemState;
  touchCount: number;
  isStarred: boolean;
  lastChanceShownAt: ISO8601 | null;
}

export interface TabDeathOpRow {
  opId: string;
  t: "CREATE" | "SET_WHY" | "TOUCH" | "STAR" | "UNSTAR" | "DELETE";
  id: UUID;
  at: ISO8601;
  url?: string;
  title?: string;
  domain?: string;
  why?: string | null;
}

export interface ItemRow extends TabDeathItem {
  createdAtMs: number;
  hasWhy: 0 | 1;
  stateRank: number;
}

export const STATE_RANK: Record<ItemState, number> = {
  fresh: 0,
  fading: 1,
  critical: 2,
  archived: 3,
  dead: 4,
};

export const materializeRow = (item: TabDeathItem): ItemRow => ({
  ...item,
  createdAtMs: toEpochMs(item.createdAt),
  hasWhy: item.why == null ? 0 : 1,
  stateRank: STATE_RANK[item.state],
});

export class TabDeathDB extends Dexie {
  items!: Table<ItemRow, UUID>;
  ops!: Table<TabDeathOpRow, string>;

  constructor() {
    super("tabdeath");
    this.version(1).stores({
      items:
        "id, createdAtMs, state, isStarred, hasWhy, domain, [state+createdAtMs], [hasWhy+createdAtMs], [isStarred+createdAtMs]",
      ops: "opId, t, id, at",
    });
  }
}

export type Tx = Transaction & { readonly _txBrand: "Tx" };

export const asTx = (tx: Transaction): Tx => tx as Tx;
