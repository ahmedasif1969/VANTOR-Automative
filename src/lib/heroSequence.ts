// Generated from the local 24 fps source video, including its final frame.
export const HERO_FRAME_COUNT = 124;

/** Direction-aware preloading, a reserved target decoder, and nearest-ready drawing. */
export class HeroSequence {
  private readonly context: CanvasRenderingContext2D;
  private readonly controller = new AbortController();
  private readonly requests = new Map<number, Promise<Blob>>();
  private readonly compressed = new Map<number, Blob>();
  private readonly fetchQueue = new Map<
    number,
    {
      resolve: (blob: Blob) => void;
      reject: (reason: unknown) => void;
    }
  >();
  private readonly fetching = new Set<number>();
  private readonly frames = new Map<number, ImageBitmap>();
  private readonly decoding = new Map<number, Promise<void>>();
  private readonly failed = new Set<number>();
  private target = 0;
  private displayed = -1;
  private direction = 1;
  private jump = 0;
  private disposed = false;
  private loaded = false;
  private width = 0;
  private height = 0;
  private readonly variant: "mobile" | "desktop";
  private readonly cacheLimit: number;
  private readonly decodeLimit: number;
  private readonly fetchLimit: number;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ready: () => void,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable");
    this.context = context;
    this.variant = window.innerWidth < 768 ? "mobile" : "desktop";
    // Mobile frames now have four times the pixels; keep decoded memory bounded.
    this.cacheLimit = this.variant === "mobile" ? 12 : 32;
    this.decodeLimit = this.variant === "mobile" ? 3 : 4;
    this.fetchLimit = this.variant === "mobile" ? 4 : 6;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  async load() {
    await this.fetchFrame(0);
    await this.decode(0);
    if (this.disposed || !this.frames.has(0))
      throw new Error("The opening video frame could not load");
    this.draw();
    for (let index = 1; index < HERO_FRAME_COUNT; index++) {
      void this.fetchFrame(index).catch(() => {});
    }
    // Warm several frames before enabling scrubbing, without loading all into RAM.
    await Promise.allSettled(
      Array.from({ length: this.decodeLimit }, async (_, offset) => {
        const index = offset + 1;
        await this.fetchFrame(index);
        await this.decode(index);
      }),
    );
    if (this.disposed) return;
    this.loaded = true;
    this.draw();
    this.pumpDecode();
    this.ready();
  }

  render(progress: number) {
    if (this.disposed || !Number.isFinite(progress)) return;
    const next = Math.round(
      Math.max(0, Math.min(1, progress)) * (HERO_FRAME_COUNT - 1),
    );
    if (next !== this.target) {
      this.jump = Math.abs(next - this.target);
      this.direction = Math.sign(next - this.target);
      this.target = next;
    }
    this.draw();
    this.trimCache();
    void this.fetchFrame(this.target).catch(() => {});
    this.pumpFetch();
    this.pumpDecode();
  }

  private candidates() {
    const ahead = Math.min(
      this.variant === "mobile" ? 8 : 22,
      (this.variant === "mobile" ? 5 : 14) + this.jump * 2,
    );
    const behind = this.cacheLimit - ahead - 1;
    const start =
      this.direction > 0 ? this.target - behind : this.target - ahead;
    const end = this.direction > 0 ? this.target + ahead : this.target + behind;
    // Spend the remaining budget on valid frames near either clip boundary.
    const low = Math.max(
      0,
      Math.min(start, HERO_FRAME_COUNT - this.cacheLimit),
    );
    const high = Math.min(
      HERO_FRAME_COUNT - 1,
      Math.max(end, this.cacheLimit - 1),
    );
    const result: number[] = [];
    for (let index = low; index <= high; index++) result.push(index);
    const score = (index: number) => {
      const delta = index - this.target;
      return Math.abs(delta) * (delta * this.direction < 0 ? 3 : 1);
    };
    return result
      .sort(
        (a, b) =>
          score(a) - score(b) ||
          Math.abs(a - this.target) - Math.abs(b - this.target),
      )
      .slice(0, this.cacheLimit);
  }

  private fetchFrame(index: number) {
    const existing = this.requests.get(index);
    if (existing) return existing;
    if (this.disposed) return Promise.reject(new Error("Sequence disposed"));
    const request = new Promise<Blob>((resolve, reject) => {
      this.fetchQueue.set(index, { resolve, reject });
    });
    this.requests.set(index, request);
    this.pumpFetch();
    return request;
  }

  private pumpFetch() {
    if (this.disposed) return;
    while (this.fetching.size < this.fetchLimit && this.fetchQueue.size) {
      const index =
        this.candidates().find((candidate) => this.fetchQueue.has(candidate)) ??
        this.fetchQueue.keys().next().value;
      if (index === undefined) return;
      const job = this.fetchQueue.get(index)!;
      this.fetchQueue.delete(index);
      this.fetching.add(index);
      const number = String(index + 1).padStart(3, "0");
      void fetch(
        "/videos/hero-frames/" +
          this.variant +
          "/frame-" +
          number +
          ".webp?v=3",
        {
          signal: this.controller.signal,
        },
      )
        .then((response) => {
          if (!response.ok)
            throw new Error("Frame " + number + " failed to load");
          return response.blob();
        })
        .then((blob) => {
          if (!this.disposed) this.compressed.set(index, blob);
          job.resolve(blob);
        })
        .catch((error: unknown) => {
          if (!this.disposed) this.failed.add(index);
          job.reject(error);
        })
        .finally(() => {
          this.fetching.delete(index);
          this.pumpFetch();
          this.pumpDecode();
        });
    }
  }

  private decode(index: number): Promise<void> {
    const existing = this.decoding.get(index);
    if (existing) return existing;
    const blob = this.compressed.get(index);
    if (
      !blob ||
      this.frames.has(index) ||
      this.failed.has(index) ||
      this.disposed
    )
      return Promise.resolve();
    const task = (async () => {
      try {
        const bitmap = await createImageBitmap(blob);
        if (this.disposed || !this.candidates().includes(index)) bitmap.close();
        else this.frames.set(index, bitmap);
      } catch {
        if (!this.disposed) this.failed.add(index);
      }
    })().finally(() => {
      this.decoding.delete(index);
      this.draw();
      this.trimCache();
      this.pumpDecode();
    });
    this.decoding.set(index, task);
    return task;
  }

  private pumpDecode() {
    if (this.disposed || !this.loaded) return;
    // Speculation cannot consume the final slot needed by the latest target.
    if (this.decoding.size < this.decodeLimit) void this.decode(this.target);
    for (const index of this.candidates()) {
      if (this.decoding.size >= this.decodeLimit - 1) break;
      if (index === this.target) continue;
      // Never occupy a decoder while waiting for a network request.
      if (this.compressed.has(index)) void this.decode(index);
    }
  }

  private trimCache() {
    if (this.disposed) return;
    const wanted = new Set(this.candidates());
    for (const [index, bitmap] of this.frames) {
      if (!wanted.has(index) && index !== this.displayed) {
        bitmap.close();
        this.frames.delete(index);
      }
    }
    const removable = [...this.frames.keys()]
      .filter((index) => index !== this.displayed && index !== this.target)
      .sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    while (this.frames.size > this.cacheLimit && removable.length) {
      const index = removable.shift()!;
      this.frames.get(index)!.close();
      this.frames.delete(index);
    }
  }

  private resize() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    const sourceWidth = this.variant === "mobile" ? 1920 : 1600;
    const sourceHeight = this.variant === "mobile" ? 1080 : 900;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      this.variant === "mobile" ? 2 : 1.5,
      sourceWidth / bounds.width,
      sourceHeight / bounds.height,
    );
    const width = Math.round(bounds.width * ratio);
    const height = Math.round(bounds.height * ratio);
    if (width === this.width && height === this.height) return;
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
    this.displayed = -1;
    this.draw();
  }

  private draw() {
    if (this.disposed || !this.width || !this.height) return;
    let index = this.target;
    if (!this.frames.has(index)) {
      // Show the nearest decoded image immediately; exact frames replace it when ready.
      index =
        [...this.frames.keys()].sort(
          (a, b) =>
            Math.abs(a - this.target) - Math.abs(b - this.target) ||
            (b - a) * this.direction,
        )[0] ?? -1;
    }
    const bitmap = this.frames.get(index);
    if (!bitmap || this.displayed === index) return;
    const scale = Math.max(
      this.width / bitmap.width,
      this.height / bitmap.height,
    );
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    const x = (this.width - width) * (this.variant === "mobile" ? 0.6 : 0.5);
    this.context.drawImage(
      bitmap,
      x,
      (this.height - height) * 0.52,
      width,
      height,
    );
    this.displayed = index;
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    this.resizeObserver.disconnect();
    for (const job of this.fetchQueue.values())
      job.reject(new Error("Sequence disposed"));
    this.fetchQueue.clear();
    for (const bitmap of this.frames.values()) bitmap.close();
    this.frames.clear();
    this.compressed.clear();
    this.requests.clear();
  }
}
