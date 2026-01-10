import { isoNow } from "../core/util/time";

export class SystemClock {
  nowIso(): string {
    return isoNow();
  }

  nowDate(): Date {
    return new Date();
  }
}
