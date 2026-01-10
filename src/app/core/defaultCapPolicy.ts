type ItemState = "fresh" | "fading" | "critical" | "archived" | "dead";

export interface CapPolicyConfig {
  maxItems: number;
}

export interface ItemMeta {
  id: string;
  createdAt: string;
  state: ItemState;
  isStarred: boolean;
  lastChanceShownAt: string | null;
}

export class DefaultCapPolicy {
  planEviction(meta: ItemMeta[], cap: CapPolicyConfig): { deleteIds: string[]; reason: "over_cap" } {
    const deleteIds: string[] = [];
    const safe = meta.filter((item) => !item.isStarred);
    const dead = safe.filter((item) => item.state === "dead");
    const archived = safe.filter((item) => item.state === "archived");
    const critical = safe.filter((item) => item.state === "critical" && !item.lastChanceShownAt);

    const byOldest = (a: ItemMeta, b: ItemMeta) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    dead.sort(byOldest);
    archived.sort(byOldest);
    critical.sort(byOldest);

    const pool = [...dead, ...archived, ...critical];
    for (const item of pool) {
      deleteIds.push(item.id);
    }

    return { deleteIds, reason: "over_cap" };
  }
}
