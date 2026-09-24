"use strict";
// Renders each arrangement offline on the game's desk and voices: every bar
// booked a few bars ahead of the render (OfflineAudioContext suspends to let
// us), the same fades on the same bar lines, then the tonic once to finish.
(async () => {
  const T = MusicTheme, S = MusicSynth, RATE = 48000, LEAD = 0.25, CHUNK = 4, RING = 3.5;
  const stages = MusicTracks.STAGES, BARS = stages.length * T.BARS;
  const stageAt = (i) => LEAD + i * T.BARS * T.BAR_SEC;

  // Set the desk to a mix: at once for the first bar, on the bar line after.
  function applyMix(d, m, at, first) {
    for (const [tier, g] of Object.entries(d.tiers)) {
      if (first) g.gain.setValueAtTime(m.tiers[tier] || 0, 0);
      else g.gain.setTargetAtTime(m.tiers[tier] || 0, at, S.FADE.tier);
    }
    for (const [key, g] of Object.entries(d.parts)) {
      if (first) g.gain.setValueAtTime(m.parts[key] || 0, 0);
      else g.gain.setTargetAtTime(m.parts[key] || 0, at, S.FADE.part);
    }
  }

  function renderZone(zone) {
    const codaAt = stageAt(stages.length), end = codaAt + RING;
    const ctx = new OfflineAudioContext(1, Math.ceil(end * RATE), RATE);
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const d = S.desk(ctx, T, master), v = S.voices(ctx);
    let prevStage = null, prevLive = new Set();
    const bookBar = (bar) => {
      const stage = stages[Math.floor(bar / T.BARS)], m = T.mix({ zone: zone.id, fullness: stage.fullness });
      const at = LEAD + bar * T.BAR_SEC;
      if (stage !== prevStage) applyMix(d, m, at, !prevStage);
      const live = S.live(T, m);                       // a part turned down plays one more bar, as in the game
      S.book(T, v, d, new Set([...live, ...prevLive]), bar, at);
      prevStage = stage; prevLive = live;
    };
    const bookChunk = (c) => { for (let b = c; b < Math.min(BARS, c + CHUNK); b++) bookBar(b); };
    bookChunk(0);
    for (let c = CHUNK; c < BARS; c += CHUNK) {
      const t = (Math.round(((LEAD + c * T.BAR_SEC - 1) * RATE) / 128) * 128) / RATE;   // a second early, on a render quantum
      ctx.suspend(t).then(() => { bookChunk(c); ctx.resume(); });
    }
    // The ending: the tonic on the next downbeat, left to ring, then a fade.
    const k = zone.coda, D = T.CHORDS.Dmaj7, ring = ctx.createGain();
    ring.gain.value = 0.55;
    ring.connect(d.music);
    for (const n of D.tones) v[k.chord](n + k.up, codaAt, 1.6, 0.7, ring);
    v[k.bass](D.root + k.bassUp, codaAt, 1.6, 0.9, ring);
    v[k.kick](0, codaAt, 0.2, 0.9, ring);
    master.gain.setValueAtTime(1, end - 1.2);
    master.gain.linearRampToValueAtTime(0, end - 0.02);
    return ctx.startRendering();
  }

  const db = (x) => +(20 * Math.log10(Math.max(x, 1e-9))).toFixed(1);
  function peakOf(buf) { let p = 0; for (const s of buf.getChannelData(0)) p = Math.max(p, Math.abs(s)); return p; }
  function stageRms(buf) {
    const x = buf.getChannelData(0);
    return stages.map((s, i) => {
      const a = Math.floor(stageAt(i) * RATE), b = Math.floor(stageAt(i + 1) * RATE);
      let sum = 0;
      for (let j = a; j < b; j++) sum += x[j] * x[j];
      return db(Math.sqrt(sum / (b - a)));
    });
  }

  // 16-bit mono WAV, with a whisper of dither.
  function wav(buf, gain) {
    const x = buf.getChannelData(0), n = x.length, bytes = new ArrayBuffer(44 + n * 2), dv = new DataView(bytes);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVE");
    str(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, RATE, true); dv.setUint32(28, RATE * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    str(36, "data"); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = x[i] * gain + (Math.random() - Math.random()) / 65536;
      dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(s * 32767))), true);
    }
    return bytes;
  }

  const rendered = [];
  for (const zone of MusicTracks.ZONES) {
    const t = performance.now();
    rendered.push({ zone, buf: await renderZone(zone) });
    tool.log(zone.file + " rendered in " + Math.round(performance.now() - t) + " ms");
  }
  // One gain for all three, so their balance in the game survives: the loudest
  // peak lands at -1 dBFS.
  const gain = Math.min(4, Math.pow(10, -1 / 20) / Math.max(...rendered.map((r) => peakOf(r.buf))));
  const report = { gainDb: db(gain), tracks: [] };
  for (const { zone, buf } of rendered) {
    await tool.save(zone.file + ".wav", wav(buf, gain));
    report.tracks.push({ file: zone.file, seconds: +(buf.length / RATE).toFixed(2), peakDb: db(peakOf(buf) * gain),
      stageRmsDb: stageRms(buf).map((x) => +(x + db(gain)).toFixed(1)), stageStarts: stages.map((s, i) => +stageAt(i).toFixed(2)) });
  }
  await tool.done(report);
})().catch((e) => tool.done({ error: String((e && e.stack) || e) }));
