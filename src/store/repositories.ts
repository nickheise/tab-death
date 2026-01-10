import Dexie from "dexie";
import {
  ItemRow,
  TabDeathDB,
  TabDeathItem,
  TabDeathOpRow,
  Tx,
  asTx,
  materializeRow,
} from "./db";

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface ListOptions {
  limit: number;
  cursor?: string;
}

export interface ItemQuery {
  state?: string;
  states?: string[];
  isStarred?: boolean;
  hasWhy?: boolean;
  domain?: string;
  createdAtBefore?: string;
  createdAtAfter?: string;
}

export interface SearchQuery {
  q: string;
  limit: number;
  state?: string | string[];
}

export interface ItemMeta {
  id: string;
  createdAt: string;
  state: "fresh" | "fading" | "critical" | "archived" | "dead";
  isStarred: boolean;
  lastChanceShownAt: string | null;
}

export interface ItemRepository {
  withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  getById(id: string, tx?: Tx): Promise<TabDeathItem | null>;
  put(item: TabDeathItem, tx?: Tx): Promise<void>;
  bulkPut(items: TabDeathItem[], tx?: Tx): Promise<void>;
  update(id: string, patch: Partial<TabDeathItem>, tx?: Tx): Promise<void>;
  delete(id: string, tx?: Tx): Promise<void>;
  bulkDelete(ids: string[], tx?: Tx): Promise<void>;
  list(query: ItemQuery, opts: ListOptions): Promise<Page<TabDeathItem>>;
  listStarredOldest(limit: number, tx?: Tx): Promise<TabDeathItem[]>;
  listMetaForCap(opts: { limit: number }): Promise<ItemMeta[]>;
  searchArchived(query: SearchQuery): Promise<TabDeathItem[]>;
  count(query: ItemQuery, tx?: Tx): Promise<number>;
  listMetaForCap(opts: { limit: number }): Promise<ItemMeta[]>;
  searchArchived(query: SearchQuery): Promise<TabDeathItem[]>;
  count(query: ItemQuery): Promise<number>;
}

export interface OpRepository {
  append(op: Omit<TabDeathOpRow, "opId">, tx?: Tx): Promise<TabDeathOpRow>;
  bulkAppend(ops: Array<Omit<TabDeathOpRow, "opId">>, tx?: Tx): Promise<TabDeathOpRow[]>;
  listSince(opIdExclusive: string | null, limit: number): Promise<Page<TabDeathOpRow>>;
  compact(policy: { keepLastN: number }, tx?: Tx): Promise<void>;
}

export const makeOpId = (atIso: string, id: string, t: string): string => {
  const rand = Math.random().toString(16).slice(2);
  return `${atIso}:${id}:${t}:${rand}`;
};

export class DexieItemRepository implements ItemRepository {
  constructor(private readonly db: TabDeathDB) {}

  async withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction("rw", this.db.items, this.db.ops, async (tx) => fn(asTx(tx)));
  }

  async getById(id: string, tx?: Tx): Promise<TabDeathItem | null> {
    const table = tx ? (tx as any).table("items") : this.db.items;
    const row = (await table.get(id)) as ItemRow | undefined;
    return row ? this.rowToItem(row) : null;
  }

  async put(item: TabDeathItem, tx?: Tx): Promise<void> {
    const row = materializeRow(item);
    const table = tx ? (tx as any).table("items") : this.db.items;
    await table.put(row);
  }

  async bulkPut(items: TabDeathItem[], tx?: Tx): Promise<void> {
    if (!items.length) return;
    const rows = items.map(materializeRow);
    const table = tx ? (tx as any).table("items") : this.db.items;
    await table.bulkPut(rows);
  }

  async update(id: string, patch: Partial<TabDeathItem>, tx?: Tx): Promise<void> {
    const table = tx ? (tx as any).table("items") : this.db.items;
    const existing = (await table.get(id)) as ItemRow | undefined;
    if (!existing) return;

    const next: TabDeathItem = { ...this.rowToItem(existing), ...patch };
    await table.put(materializeRow(next));
  }

  async delete(id: string, tx?: Tx): Promise<void> {
    const table = tx ? (tx as any).table("items") : this.db.items;
    await table.delete(id);
  }

  async bulkDelete(ids: string[], tx?: Tx): Promise<void> {
    if (!ids.length) return;
    const table = tx ? (tx as any).table("items") : this.db.items;
    await table.bulkDelete(ids);
  }

  async list(query: ItemQuery, opts: ListOptions): Promise<Page<TabDeathItem>> {
    const limit = Math.max(1, Math.min(opts.limit, 200));
    let coll: Dexie.Collection<ItemRow, any> = this.db.items.toCollection();

    if (query.domain) coll = this.db.items.where("domain").equals(query.domain);
    if (query.isStarred != null) coll = this.db.items.where("isStarred").equals(query.isStarred as any);
    if (query.state) coll = this.db.items.where("state").equals(query.state as any);
    if (query.states && query.states.length) coll = this.db.items.where("state").anyOf(query.states as any);
    if (query.hasWhy != null) coll = this.db.items.where("hasWhy").equals(query.hasWhy ? 1 : 0);

    if (opts.cursor) {
      const cursorMs = new Date(opts.cursor).getTime();
      coll = coll.and((r) => r.createdAtMs < cursorMs);
    }

    if (query.createdAtAfter) {
      const ms = new Date(query.createdAtAfter).getTime();
      coll = coll.and((r) => r.createdAtMs >= ms);
    }
    if (query.createdAtBefore) {
      const ms = new Date(query.createdAtBefore).getTime();
      coll = coll.and((r) => r.createdAtMs <= ms);
    }

    const rows = await coll.orderBy("createdAtMs").reverse().limit(limit).toArray();
    const items = rows.map((r) => this.rowToItem(r));
    const nextCursor =
      rows.length === limit ? new Date(rows[rows.length - 1].createdAtMs).toISOString() : undefined;
    return { items, nextCursor };
  }

  async listStarredOldest(limit: number, tx?: Tx): Promise<TabDeathItem[]> {
    const capped = Math.max(1, Math.min(limit, 50));
    const table = tx ? (tx as any).table("items") : this.db.items;
    const rows = await table.where("isStarred").equals(true).orderBy("createdAtMs").limit(capped).toArray();
    return rows.map((row: ItemRow) => this.rowToItem(row));
  }

  async listMetaForCap(opts: { limit: number }): Promise<ItemMeta[]> {
    const limit = Math.max(1, Math.min(opts.limit, 10000));
    const archived = await this.db.items
      .where("[state+createdAtMs]")
      .between(["archived", Dexie.minKey], ["archived", Dexie.maxKey])
      .limit(limit)
      .toArray();

    const dead = await this.db.items
      .where("[state+createdAtMs]")
      .between(["dead", Dexie.minKey], ["dead", Dexie.maxKey])
      .limit(limit)
      .toArray();

    const combined = [...dead, ...archived].slice(0, limit);
    return combined.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      state: r.state,
      isStarred: r.isStarred,
      lastChanceShownAt: r.lastChanceShownAt,
    }));
  }

  async searchArchived(query: SearchQuery): Promise<TabDeathItem[]> {
    const q = query.q.trim().toLowerCase();
    if (!q) return [];
    const limit = Math.max(1, Math.min(query.limit, 50));

    const rows = await this.db.items.where("state").equals("archived").reverse().limit(1000).toArray();

    const hits: TabDeathItem[] = [];
    for (const r of rows) {
      const hay = `${r.title} ${r.why ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push(this.rowToItem(r));
        if (hits.length >= limit) break;
      }
    }
    return hits;
  }

  async count(query: ItemQuery, tx?: Tx): Promise<number> {
    const table = tx ? (tx as any).table("items") : this.db.items;
    if (query.state) return table.where("state").equals(query.state as any).count();
    if (query.isStarred != null) {
      return table.where("isStarred").equals(query.isStarred as any).count();
    }
    if (query.hasWhy != null) return table.where("hasWhy").equals(query.hasWhy ? 1 : 0).count();
    return table.count();
  async count(query: ItemQuery): Promise<number> {
    if (query.state) return this.db.items.where("state").equals(query.state as any).count();
    if (query.isStarred != null) {
      return this.db.items.where("isStarred").equals(query.isStarred as any).count();
    }
    if (query.hasWhy != null) return this.db.items.where("hasWhy").equals(query.hasWhy ? 1 : 0).count();
    return this.db.items.count();
  }

  private rowToItem(row: ItemRow): TabDeathItem {
    const { createdAtMs, hasWhy, stateRank, ...item } = row;
    return item;
  }
}

export class DexieOpRepository implements OpRepository {
  constructor(private readonly db: TabDeathDB) {}

  async append(op: Omit<TabDeathOpRow, "opId">, tx?: Tx): Promise<TabDeathOpRow> {
    const row: TabDeathOpRow = { ...op, opId: makeOpId(op.at, op.id, op.t) };
    const table = tx ? (tx as any).table("ops") : this.db.ops;
    await table.put(row);
    return row;
  }

  async bulkAppend(ops: Array<Omit<TabDeathOpRow, "opId">>, tx?: Tx): Promise<TabDeathOpRow[]> {
    if (!ops.length) return [];
    const rows = ops.map((op) => ({ ...op, opId: makeOpId(op.at, op.id, op.t) }));
    const table = tx ? (tx as any).table("ops") : this.db.ops;
    await table.bulkPut(rows);
    return rows;
  }

  async listSince(opIdExclusive: string | null, limit: number): Promise<Page<TabDeathOpRow>> {
    const lim = Math.max(1, Math.min(limit, 500));
    const coll = opIdExclusive ? this.db.ops.where("opId").above(opIdExclusive) : this.db.ops.orderBy("opId");
    const items = await coll.limit(lim).toArray();
    const nextCursor = items.length === lim ? items[items.length - 1].opId : undefined;
    return { items, nextCursor };
  }

  async compact(policy: { keepLastN: number }, tx?: Tx): Promise<void> {
    const keep = Math.max(1000, policy.keepLastN);
    const table = tx ? (tx as any).table("ops") : this.db.ops;

    const total = await table.count();
    const over = total - keep;
    if (over <= 0) return;

    const oldest = await table.orderBy("opId").limit(over).toArray();
    const keys = oldest.map((o: TabDeathOpRow) => o.opId);
    await table.bulkDelete(keys);
  }
}
