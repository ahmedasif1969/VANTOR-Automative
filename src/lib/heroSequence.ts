// Every source frame is shown in order, including the final frame.
export const HERO_FRAME_COUNT = 124;
export const HERO_STARTUP_DOWNLOAD_FRAMES = 32;
export const HERO_STARTUP_DECODE_FRAMES = 8;

export type HeroStartupProgress = { downloaded: number; decoded: number };

type Variant = "desktop" | "mobile";

export class HeroSequence {
  private readonly context: CanvasRenderingContext2D;
  private readonly controller = new AbortController();
  private readonly compressed = new Map<number, Blob>();
  private readonly frames = new Map<number, ImageBitmap>();
  private readonly requests = new Map<number, Promise<Blob>>();
  private readonly queue = new Map<number, {
    resolve: (blob: Blob) => void;
    reject: (error: unknown) => void;
  }>();
  private readonly fetching = new Set<number>();
  private readonly decoding = new Map<number, Promise<void>>();
  private readonly failed = new Set<number>();
  private readonly decodedOnce = new Set<number>();
  private readonly resizeObserver: ResizeObserver;
  private readonly variant: Variant;
  private readonly fetchLimit: number;
  private readonly decodeLimit: number;
  private readonly cacheLimit: number;
  private width = 0;
  private height = 0;
  private displayed = -1;
  private requested = 0;
  private direction = 1;
  private animationFrame = 0;
  private disposed = false;
  private loaded = false;
  private needsRedraw = true;
  private startupBufferReady = false;
  private reportedStartupDownloaded = -1;
  private reportedStartupDecoded = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ready: () => void,
    private readonly onFrame: (progress: number) => void,
    variant: Variant = window.innerWidth < 768 ? "mobile" : "desktop",
    private readonly onFailure: () => void = () => {},
    private readonly onBufferProgress: (progress: HeroStartupProgress) => void = () => {},
    private readonly onBufferReady: () => void = () => {},
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable");
    this.context = context;
    this.variant = variant;
    this.fetchLimit = variant === "mobile" ? 3 : 4;
    this.decodeLimit = variant === "mobile" || ((window.navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) <= 2 ? 2 : 3;
    this.cacheLimit = variant === "mobile" ? 10 : 16;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  async load() {
    await this.fetchFrame(0);
    await this.decode(0);
    if (this.disposed || !this.frames.has(0)) throw new Error("Opening frame failed");
    this.paint(0);
    this.loaded = true;
    this.ready();
    // Queue only the chosen variant. Compressed data is retained for this visit.
    for (let index = 1; index < HERO_FRAME_COUNT; index++) void this.fetchFrame(index).catch(() => {});
    this.pumpFetch();
    this.pumpDecode();
    this.schedule();
  }

  render(progress: number) {
    if (this.disposed || !Number.isFinite(progress)) return;
    this.requested = Math.round(Math.max(0, Math.min(1, progress)) * (HERO_FRAME_COUNT - 1));
    if (this.displayed >= 0 && this.requested !== this.displayed) {
      this.direction = Math.sign(this.requested - this.displayed);
    }
    this.pumpFetch();
    this.pumpDecode();
    this.schedule();
  }

  get isComplete() {
    return this.displayed === HERO_FRAME_COUNT - 1;
  }

  private readonly onVisibilityChange = () => {
    if (!document.hidden) {
      this.pumpFetch();
      this.pumpDecode();
      this.schedule();
    }
  };

  private fetchFrame(index: number) {
    const existing = this.requests.get(index);
    if (existing) return existing;
    if (this.disposed) return Promise.reject(new Error("Sequence disposed"));
    const request = new Promise<Blob>((resolve, reject) => {
      this.queue.set(index, { resolve, reject });
    });
    this.requests.set(index, request);
    this.pumpFetch();
    return request;
  }

  private nextFetch() {
    const next = this.displayed < 0 ? 0 : this.displayed + this.direction;
    if (this.queue.has(next)) return next;
    // Prepare the next few frames before spending slots on distant frames.
    for (let distance = 2; distance <= 8; distance++) {
      const index = this.displayed + this.direction * distance;
      if (this.queue.has(index)) return index;
    }
    // Continue the complete background download even while the user stays still.
    return this.queue.keys().next().value as number | undefined;
  }

  private pumpFetch() {
    if (this.disposed || document.hidden) return;
    while (this.fetching.size < this.fetchLimit && this.queue.size) {
      const index = this.nextFetch();
      if (index === undefined) return;
      const job = this.queue.get(index)!;
      this.queue.delete(index);
      this.fetching.add(index);
      const number = String(index + 1).padStart(3, "0");
      void fetch(`/videos/hero-frames/${this.variant}/frame-${number}.webp?v=${this.variant === "mobile" ? 4 : 3}`, {
        signal: this.controller.signal,
        mode: "no-cors",
        priority: index === this.displayed + this.direction ? "high" : "low",
      })
        .then(response => {
          if (!response.ok) throw new Error(`Frame ${number} failed`);
          return response.blob();
        })
        .then(blob => {
          if (!this.disposed) {
            this.compressed.set(index, blob);
            this.reportStartupBuffer();
          }
          job.resolve(blob);
        })
        .catch(error => {
          if (!this.disposed) this.failed.add(index);
          job.reject(error);
        })
        .finally(() => {
          this.fetching.delete(index);
          this.pumpFetch();
          this.pumpDecode();
          if (this.failed.has(index) && index === this.displayed + Math.sign(this.requested - this.displayed)) this.schedule();
        });
    }
  }

  private decode(index: number): Promise<void> {
    const existing = this.decoding.get(index);
    if (existing) return existing;
    const blob = this.compressed.get(index);
    if (!blob || this.frames.has(index) || this.failed.has(index) || this.disposed) return Promise.resolve();
    const task = (async () => {
      try {
        const bitmap = await createImageBitmap(blob);
        if (this.disposed || !this.wantedFrames().has(index)) bitmap.close();
        else this.frames.set(index, bitmap);
        if (!this.disposed) {
          this.decodedOnce.add(index);
          this.reportStartupBuffer();
        }
      } catch {
        if (!this.disposed) this.failed.add(index);
      }
    })().finally(() => {
      this.decoding.delete(index);
      this.trimCache();
      this.pumpDecode();
      this.schedule();
    });
    this.decoding.set(index, task);
    return task;
  }

  private reportStartupBuffer() {
    if (this.startupBufferReady) return;
    let downloaded = 0;
    while (downloaded < HERO_STARTUP_DOWNLOAD_FRAMES && this.compressed.has(downloaded)) downloaded++;
    let decoded = 0;
    while (decoded < HERO_STARTUP_DECODE_FRAMES && this.decodedOnce.has(decoded)) decoded++;
    if (downloaded !== this.reportedStartupDownloaded || decoded !== this.reportedStartupDecoded) {
      this.reportedStartupDownloaded = downloaded;
      this.reportedStartupDecoded = decoded;
      this.onBufferProgress({ downloaded, decoded });
    }
    if (downloaded === HERO_STARTUP_DOWNLOAD_FRAMES && decoded === HERO_STARTUP_DECODE_FRAMES) {
      this.startupBufferReady = true;
      this.onBufferReady();
    }
  }

  private wantedFrames() {
    const wanted = new Set<number>();
    if (this.displayed >= 0) wanted.add(this.displayed);
    const origin = Math.max(0, this.displayed);
    for (let distance = 1; distance <= 8; distance++) {
      const index = origin + distance * this.direction;
      if (index >= 0 && index < HERO_FRAME_COUNT) wanted.add(index);
    }
    if (this.displayed < 0) wanted.add(0);
    return wanted;
  }

  private pumpDecode() {
    if (!this.loaded || this.disposed || document.hidden) return;
    const wanted = this.wantedFrames();
    for (const index of wanted) {
      if (this.decoding.size >= this.decodeLimit) break;
      if (this.compressed.has(index)) void this.decode(index);
    }
  }

  private trimCache() {
    const wanted = this.wantedFrames();
    for (const [index, bitmap] of this.frames) {
      if (!wanted.has(index)) {
        bitmap.close();
        this.frames.delete(index);
      }
    }
    // The directional window is at most nine images; this also protects future edits.
    while (this.frames.size > this.cacheLimit) {
      const index = [...this.frames.keys()].find(key => key !== this.displayed);
      if (index === undefined) break;
      this.frames.get(index)!.close();
      this.frames.delete(index);
    }
  }

  private resize() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const sourceWidth = this.variant === "mobile" ? 840 : 1600;
    const sourceHeight = this.variant === "mobile" ? 1080 : 900;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, sourceWidth / bounds.width, sourceHeight / bounds.height);
    const width = Math.round(bounds.width * ratio);
    const height = Math.round(bounds.height * ratio);
    if (width === this.width && height === this.height) return;
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
    this.needsRedraw = true;
    this.schedule();
  }

  private schedule() {
    if (this.disposed || !this.loaded || document.hidden || this.animationFrame) return;
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = 0;
      if (this.disposed || document.hidden) return;
      const next = this.displayed + Math.sign(this.requested - this.displayed);
      try {
        if (this.displayed >= 0 && next !== this.displayed && this.failed.has(next)) {
          this.destroy();
          this.onFailure();
          return;
        }
        if (this.displayed >= 0 && next !== this.displayed && this.frames.has(next)) {
          this.paint(next);
          this.trimCache();
          this.pumpFetch();
          this.pumpDecode();
          if (this.displayed !== this.requested) this.schedule();
        } else if (this.needsRedraw && this.displayed >= 0) {
          this.paint(this.displayed);
        }
      } catch {
        this.destroy();
        this.onFailure();
      }
      // An unavailable next frame wakes this loop when its decode completes.
    });
  }

  private paint(index: number) {
    const bitmap = this.frames.get(index);
    if (!bitmap || !this.width || !this.height) return;
    const scale = Math.max(this.width / bitmap.width, this.height / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    this.context.drawImage(bitmap,
      (this.width - width) * (this.variant === "mobile" ? 0.6 : 0.5),
      (this.height - height) * 0.52,
      width, height);
    this.displayed = index;
    this.needsRedraw = false;
    this.onFrame(index / (HERO_FRAME_COUNT - 1));
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.controller.abort();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    for (const job of this.queue.values()) job.reject(new Error("Sequence disposed"));
    this.queue.clear();
    for (const bitmap of this.frames.values()) bitmap.close();
    this.frames.clear();
    this.compressed.clear();
    this.requests.clear();
  }
}
