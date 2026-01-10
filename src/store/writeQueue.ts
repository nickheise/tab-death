type FlushFn<T> = (batch: T[]) => Promise<void>;

export class MicroBatchQueue<T> {
  private buf: T[] = [];
  private timer: number | null = null;

  constructor(
    private readonly flushFn: FlushFn<T>,
    private readonly windowMs: number = 150,
    private readonly maxBatch: number = 100
  ) {}

  push(item: T) {
    this.buf.push(item);
    if (this.buf.length >= this.maxBatch) {
      void this.flush();
      return;
    }
    if (this.timer == null) {
      this.timer = self.setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, this.windowMs) as unknown as number;
    }
  }

  async flush() {
    if (!this.buf.length) return;
    const batch = this.buf.splice(0, this.buf.length);
    try {
      await this.flushFn(batch);
    } catch (error) {
      console.error("MicroBatchQueue flush failed", error);
    }
  }
}
