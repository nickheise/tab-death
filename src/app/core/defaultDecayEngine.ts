import { parseIso } from "../../core/util/time";
import { TabDeathItem } from "../../store/db";

export type ItemState = "fresh" | "fading" | "critical" | "archived" | "dead";

export interface DecayPolicyConfig {
  freshDays: number;
  fadingDays: number;
  criticalDays: number;
  archiveDays: number;
  starsPauseDecay: boolean;
}

export class DefaultDecayEngine {
  ageDays(createdAt: Date, now: Date): number {
    const ms = now.getTime() - createdAt.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  stateForCreatedAt(createdAt: Date, now: Date, policy: DecayPolicyConfig): ItemState {
    const days = this.ageDays(createdAt, now);
    if (days <= policy.freshDays) return "fresh";
    if (days <= policy.fadingDays) return "fading";
    if (days <= policy.criticalDays) return "critical";
    if (days <= policy.archiveDays) return "archived";
    return "dead";
  }

  evaluate(item: TabDeathItem, now: Date, policy: DecayPolicyConfig): TabDeathItem {
    if (item.isStarred && policy.starsPauseDecay) return item;
    const createdAt = parseIso(item.createdAt);
    const nextState = this.stateForCreatedAt(createdAt, now, policy);

    if (nextState === item.state) return item;
    const order: Record<ItemState, number> = {
      fresh: 0,
      fading: 1,
      critical: 2,
      archived: 3,
      dead: 4,
    };
    if (order[nextState] < order[item.state]) return item;

    return { ...item, state: nextState };
  }
}
