import { TabDeathItem } from "../../store/db";
import { DexieItemRepository, DexieOpRepository } from "../../store/repositories";

export interface DecayPolicyConfig {
  freshDays: number;
  fadingDays: number;
  criticalDays: number;
  archiveDays: number;
  starsPauseDecay: boolean;
}

export interface DecayEngine {
  evaluate(item: TabDeathItem, now: Date, policy: DecayPolicyConfig): TabDeathItem;
  stateForCreatedAt(createdAt: Date, now: Date, policy: DecayPolicyConfig): ItemState;
  ageDays(createdAt: Date, now: Date): number;
}

export interface CapPolicyConfig {
  maxItems: number;
}

export interface CapPolicy {
  planEviction(
    meta: Array<{ id: string; createdAt: string; state: ItemState; isStarred: boolean; lastChanceShownAt: string | null }>,
    cap: CapPolicyConfig
  ): { deleteIds: string[]; reason: "over_cap" };
}

export interface MaintenanceService {
  runDailyMaintenance(now: Date): Promise<void>;
  getReviewBuckets(now: Date): Promise<{ unclaimed: TabDeathItem[]; deathRow: TabDeathItem[]; starred: TabDeathItem[] }>;
}

type ItemState = "fresh" | "fading" | "critical" | "archived" | "dead";

export class DefaultMaintenanceService implements MaintenanceService {
  constructor(
    private readonly items: DexieItemRepository,
    private readonly ops: DexieOpRepository,
    private readonly decay: DecayEngine,
    private readonly decayCfg: DecayPolicyConfig,
    private readonly cap: CapPolicy,
    private readonly capCfg: CapPolicyConfig,
    private readonly opCompaction: { keepLastN: number }
  ) {}

  async runDailyMaintenance(now: Date): Promise<void> {
    await this.items.withTx(async (tx) => {
      const candidates: TabDeathItem[] = [];
      for (const state of ["fresh", "fading", "critical", "archived"] as const) {
        const page = await this.items.list({ state }, { limit: 250 });
        candidates.push(...page.items);
      }

      const updates: TabDeathItem[] = [];
      for (const item of candidates) {
        const next = this.decay.evaluate(item, now, this.decayCfg);
        if (next.state !== item.state) {
          updates.push(next);
        }
      }
      if (updates.length) await this.items.bulkPut(updates, tx);

      const total = await this.items.count({});
      if (total > this.capCfg.maxItems) {
        const meta = await this.items.listMetaForCap({ limit: 5000 });
        const plan = this.cap.planEviction(meta, this.capCfg);
        if (plan.deleteIds.length) {
          const at = new Date(now).toISOString();
          await this.ops.bulkAppend(
            plan.deleteIds.map((id) => ({ t: "DELETE" as const, id, at })),
            tx
          );
          await this.items.bulkDelete(plan.deleteIds, tx);
        }
      }

      await this.ops.compact(this.opCompaction, tx);
    });
  }

  async getReviewBuckets(now: Date): Promise<{ unclaimed: TabDeathItem[]; deathRow: TabDeathItem[]; starred: TabDeathItem[] }> {
    const unclaimed = (await this.items.list({ hasWhy: false }, { limit: 25 })).items;
    const deathRowBase = (await this.items.list({ state: "critical" }, { limit: 50 })).items;
    const deathRow = deathRowBase.filter((item) => !item.lastChanceShownAt).slice(0, 10);
    const starred = (await this.items.list({ isStarred: true }, { limit: 25 })).items;

    return { unclaimed, deathRow, starred };
  }
}
