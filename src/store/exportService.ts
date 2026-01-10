import { TabDeathDB, TabDeathItem } from "./db";

export type ExportFormat = "json_items" | "json_ops" | "csv_items";

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}

export class ExportService {
  constructor(private readonly db: TabDeathDB) {}

  async export(format: ExportFormat): Promise<ExportArtifact> {
    if (format === "json_ops") {
      const ops = await this.db.ops.toArray();
      const lines = ops.map((op) => JSON.stringify(op));
      return this.encode("tabdeath-export.jsonl", "application/jsonl", lines.join("\n"));
    }

    if (format === "csv_items") {
      const items = await this.db.items.toArray();
      const csv = this.toCsv(items);
      return this.encode("tabdeath-export.csv", "text/csv", csv);
    }

    const items = await this.db.items.toArray();
    const payload = {
      exportedAt: new Date().toISOString(),
      items,
    };
    return this.encode("tabdeath-export.json", "application/json", JSON.stringify(payload, null, 2));
  }

  private encode(filename: string, mimeType: string, content: string): ExportArtifact {
    return {
      filename,
      mimeType,
      bytes: new TextEncoder().encode(content),
    };
  }

  private toCsv(items: TabDeathItem[]): string {
    const header = [
      "id",
      "url",
      "title",
      "domain",
      "why",
      "createdAt",
      "lastTouchedAt",
      "state",
      "touchCount",
      "isStarred",
      "lastChanceShownAt",
    ];

    const rows = items.map((item) =>
      [
        item.id,
        item.url,
        item.title,
        item.domain,
        item.why ?? "",
        item.createdAt,
        item.lastTouchedAt ?? "",
        item.state,
        String(item.touchCount),
        item.isStarred ? "true" : "false",
        item.lastChanceShownAt ?? "",
      ]
        .map(this.escapeCsv)
        .join(",")
    );

    return [header.join(","), ...rows].join("\n");
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
