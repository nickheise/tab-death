import { isoNow } from "../../core/util/time";
import { newId } from "../../core/util/uuid";
import { TabDeathDB, TabDeathItem } from "../../store/db";
import { DexieItemRepository, DexieOpRepository } from "../../store/repositories";

export interface CaptureSnapshot {
  url: string;
  title: string;
  domain: string;
  at: string;
  why: string | null;
}

export interface CaptureService {
  captureClosedTab(snapshot: CaptureSnapshot): Promise<string>;
  annotateWhy(id: string, why: string | null): Promise<void>;
  touch(id: string): Promise<void>;
  star(id: string): Promise<void>;
  unstar(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  markLastChanceShown(ids: string[]): Promise<void>;
}

export class DefaultCaptureService implements CaptureService {
  constructor(
    private readonly db: TabDeathDB,
    private readonly items: DexieItemRepository,
    private readonly ops: DexieOpRepository,
    private readonly maxStars: number
    private readonly ops: DexieOpRepository
  ) {}

  async captureClosedTab(snapshot: CaptureSnapshot): Promise<string> {
    const id = newId();
    const at = snapshot.at;

    const item: TabDeathItem = {
      id,
      url: snapshot.url,
      title: snapshot.title,
      domain: snapshot.domain,
      why: snapshot.why ?? null,
      createdAt: at,
      lastTouchedAt: null,
      state: "fresh",
      touchCount: 0,
      isStarred: false,
      lastChanceShownAt: null,
    };

    await this.items.withTx(async (tx) => {
      await this.ops.append(
        {
          t: "CREATE",
          id,
          at,
          url: item.url,
          title: item.title,
          domain: item.domain,
          why: item.why,
        },
        tx
      );
      await this.items.put(item, tx);
    });

    return id;
  }

  async annotateWhy(id: string, why: string | null): Promise<void> {
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      await this.ops.append({ t: "SET_WHY", id, at, why }, tx);
      await this.items.update(id, { why }, tx);
    });
  }

  async touch(id: string): Promise<void> {
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      await this.ops.append({ t: "TOUCH", id, at }, tx);
      const existing = await this.items.getById(id, tx);
      if (!existing) return;
      await this.items.update(
        id,
        {
          lastTouchedAt: at,
          touchCount: (existing.touchCount ?? 0) + 1,
        },
        tx
      );
    });
  }

  async star(id: string): Promise<void> {
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      const existing = await this.items.getById(id, tx);
      if (!existing || existing.isStarred) return;
      const starCount = await this.items.count({ isStarred: true }, tx);
      if (starCount >= this.maxStars) {
        const [oldest] = await this.items.listStarredOldest(1, tx);
        if (oldest) {
          await this.ops.append({ t: "UNSTAR", id: oldest.id, at }, tx);
          await this.items.update(oldest.id, { isStarred: false }, tx);
        }
      }
      await this.ops.append({ t: "STAR", id, at }, tx);
      await this.items.update(id, { isStarred: true }, tx);
    });
  }

  async unstar(id: string): Promise<void> {
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      await this.ops.append({ t: "UNSTAR", id, at }, tx);
      await this.items.update(id, { isStarred: false }, tx);
    });
  }

  async delete(id: string): Promise<void> {
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      await this.ops.append({ t: "DELETE", id, at }, tx);
      await this.items.delete(id, tx);
    });
  }

  async markLastChanceShown(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const at = isoNow();
    await this.items.withTx(async (tx) => {
      for (const id of ids) {
        await this.items.update(id, { lastChanceShownAt: at }, tx);
      }
    });
  }
}
