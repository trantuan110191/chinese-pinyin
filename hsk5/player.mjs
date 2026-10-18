export class SegmentPlayer {
  constructor(load, update, ended, error) {
    this.audio = new Audio(); this.audio.preload = 'metadata'; this.load = load;
    this.update = update; this.ended = ended; this.error = error; this.generation = 0;
    this.audio.addEventListener('timeupdate', () => this.tick());
    this.audio.addEventListener('ended', () => this.finish());
    this.audio.addEventListener('error', () => error(new Error('Trình duyệt không đọc được âm thanh.')));
    this.audio.addEventListener('pause', () => update(this));
  }
  stop() { this.audio.pause(); cancelAnimationFrame(this.frame); }
  async select(cues) {
    this.stop(); const generation = ++this.generation;
    this.cues = cues; this.index = 0; this.ready = false;
    if (!cues.length) { this.update(this); return; }
    await this.prepare(generation);
  }
  async prepare(generation = this.generation) {
    const cue = this.cues[this.index];
    const source = await this.load(cue.audioId);
    if (generation !== this.generation) return;
    if (!source) throw Error('Thiếu MP3. Hãy nhập lại hoặc khôi phục bản sao kèm âm thanh.');
    if (this.sourceId !== cue.audioId) {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = typeof source === 'string' ? null : URL.createObjectURL(source);
      this.audio.src = this.url || source; this.sourceId = cue.audioId;
      await new Promise((resolve, reject) => {
        const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(Error('Không tải được MP3.')); };
        const timer = setTimeout(fail, 15000);
        const cleanup = () => { clearTimeout(timer); this.audio.removeEventListener('loadedmetadata', done); this.audio.removeEventListener('error', fail); };
        this.audio.addEventListener('loadedmetadata', done); this.audio.addEventListener('error', fail);
      });
    }
    if (generation !== this.generation) return;
    if (cue.endMs > this.audio.duration * 1000 + 1) throw Error('Mốc kết thúc vượt thời lượng MP3.');
    this.audio.currentTime = cue.startMs / 1000; this.ready = true; this.update(this);
  }
  async play() {
    if (!this.ready) return;
    const cue = this.cues[this.index];
    if (this.audio.currentTime >= cue.endMs / 1000) this.audio.currentTime = cue.startMs / 1000;
    await this.audio.play(); this.update(this); this.animate();
  }
  animate() { cancelAnimationFrame(this.frame); if (!this.audio.paused) this.frame = requestAnimationFrame(() => { this.tick(); this.animate(); }); }
  tick() { this.update(this); const cue = this.cues?.[this.index]; if (cue && !this.audio.paused && this.audio.currentTime >= cue.endMs / 1000) this.finish(); }
  async finish() {
    if (this.finishing) return; this.finishing = true; this.stop();
    const generation = this.generation;
    try {
      if (this.index + 1 < this.cues.length) { this.index++; await this.prepare(generation); if (generation === this.generation) await this.play(); }
      else if (this.loop) { this.index = 0; await this.prepare(generation); if (generation === this.generation) await this.play(); }
      else this.ended();
    } catch (e) { this.error(e); } finally { this.finishing = false; }
  }
  seek(ratio) { const c = this.cues?.[this.index]; if (c && this.ready) this.audio.currentTime = (c.startMs + ratio * (c.endMs - c.startMs)) / 1000; }
}
