"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Download, FlipHorizontal, RotateCcw } from "lucide-react";

type ThemeKey = "paper" | "blush" | "butter" | "midnight";
type FilterKey = "original" | "mono" | "warm" | "cool";
type Stage = "outside" | "camera" | "edit" | "printing";
const THEMES = { paper: { name: "Ivory", bg: "#f7f3ea", ink: "#292620" }, blush: { name: "Rose", bg: "#efc6c1", ink: "#5a3337" }, butter: { name: "Butter", bg: "#eee2b5", ink: "#51482f" }, midnight: { name: "Ink", bg: "#292526", ink: "#f7f3ea" } };
const FILTERS: Record<FilterKey, string> = { original: "none", mono: "grayscale(1) contrast(1.04)", warm: "sepia(.3) saturate(1.08) contrast(1.02)", cool: "saturate(.8) hue-rotate(15deg) contrast(1.02)" };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const [stage, setStage] = useState<Stage>("outside");
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [shooting, setShooting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("paper");
  const [filter, setFilter] = useState<FilterKey>("original");
  const [caption, setCaption] = useState("a day to remember");
  const [mirror, setMirror] = useState(true);
  const [stripDate, setStripDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [paperReady, setPaperReady] = useState(false);
  const [savedStrip, setSavedStrip] = useState<{ url: string; previewUrl: string; filename: string } | null>(null);
  useEffect(() => { setSavedStrip(null); }, [shots, theme, filter, caption, stripDate]);
  useEffect(() => {
    return () => { if (savedStrip) URL.revokeObjectURL(savedStrip.url); };
  }, [savedStrip]);
  useEffect(() => { setStripDate(new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })); return () => { sessionRef.current++; streamRef.current?.getTracks().forEach(track => track.stop()); }; }, []);
  function stopCamera() { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setStarted(false); }
  async function startCamera() {
    setConnecting(true); setError("");
    const session = sessionRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (session !== sessionRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStarted(true);
    } catch { stopCamera(); setError("Allow camera access in your browser, then try again."); }
    finally { setConnecting(false); }
  }
  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) throw new Error("Camera is not ready. Please try again.");
    const canvas = document.createElement("canvas");
    const width = Math.min(video.videoWidth, video.videoHeight * 4 / 3), height = width * 3 / 4;
    canvas.width = Math.round(width); canvas.height = Math.round(height);
    const context = canvas.getContext("2d")!;
    if (mirror) { context.translate(canvas.width, 0); context.scale(-1, 1); }
    context.drawImage(video, (video.videoWidth - width) / 2, (video.videoHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
    setShots(previous => [...previous, canvas.toDataURL("image/jpeg", .94)]);
    setFlash(true); setTimeout(() => setFlash(false), 150);
  }
  async function sequence() {
    if (!started || shooting) return;
    const session = sessionRef.current; setShooting(true); setError("");
    try {
      for (let i = shots.length; i < 4; i++) {
        for (let n = 3; n >= 1; n--) { if (session !== sessionRef.current) return; setCount(n); await sleep(850); }
        if (session !== sessionRef.current) return;
        setCount(null); snap(); await sleep(650);
      }
      if (session === sessionRef.current) { stopCamera(); setStage("edit"); }
    } catch { setError("The camera paused. Please try taking your remaining photos again."); }
    finally { setCount(null); setShooting(false); }
  }
  function leave() { sessionRef.current++; stopCamera(); setShots([]); setError(""); setStage("outside"); }
  function retake() { setShots([]); setError(""); setStage("camera"); }
  async function download() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const W = 900, pad = 70, gap = 28, imgW = W - pad * 2, imgH = imgW * 3 / 4, head = pad, H = head + 150 + 4 * imgH + 3 * gap;
      const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
      const context = canvas.getContext("2d")!, colors = THEMES[theme];
      context.fillStyle = colors.bg; context.fillRect(0, 0, W, H); context.textAlign = "center";
      for (let i = 0; i < shots.length; i++) { const img = new Image(); img.src = shots[i]; await img.decode(); context.filter = FILTERS[filter]; context.drawImage(img, pad, head + i * (imgH + gap), imgW, imgH); }
      context.filter = "none"; context.fillStyle = colors.ink; context.font = "28px Georgia"; context.fillText(caption, W / 2, H - 82); context.globalAlpha = .68; context.font = "18px Arial"; context.fillText(stripDate, W / 2, H - 43);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not create PNG")), "image/png");
      });
      // The machine only displays a tiny image. Keep its preview independent of
      // the full-size blob URL used by the browser's download UI on iOS.
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = 225;
      previewCanvas.height = Math.round(H * previewCanvas.width / W);
      const previewContext = previewCanvas.getContext("2d");
      if (!previewContext) throw new Error("Could not create preview");
      previewContext.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      const previewUrl = previewCanvas.toDataURL("image/png");
      if (!previewUrl.startsWith("data:image/png")) throw new Error("Could not create preview PNG");
      const url = URL.createObjectURL(blob);
      const filename = `pocket-memories-photostrip-${Date.now()}.png`;
      // Keep a visible link available if the browser ignores the automatic download.
      setSavedStrip({ url, previewUrl, filename });
      setPrinted(false);
      setPaperReady(false);
      setStage("printing");
      const link = document.createElement("a");
      link.download = filename; link.href = url;
      document.body.appendChild(link);
      link.click(); link.remove();
    } catch { setError("Couldn’t save your strip. Please try again."); } finally { setSaving(false); }
  }
  const colors = THEMES[theme];
  return <main>
    {stage === "outside" || stage === "printing" ? <section className={`entrance booth-only${stage === "printing" ? " printing-screen" : ""}`}>
      <div className="booth-scene">
        <div className="roof-light"><span>Pocket Memories</span><strong>Photobooth</strong></div>
        <div className="booth">
          <div className="booth-body">
            <div className="booth-door">
              <div className="curtain-rail" aria-hidden="true" />
              <div className="curtain curtain-left" aria-hidden="true" />
              <div className="curtain curtain-right" aria-hidden="true" />
              <div className="booth-seat" aria-hidden="true" />
              {stage === "outside" && <button className="door-invite" onClick={() => setStage("camera")} aria-label="Enter the photo booth"><ArrowRight size={24} aria-hidden="true" /></button>}
            </div>
            <div className="booth-side" aria-hidden={stage === "outside" ? true : undefined}>
              <div className="coin-slot" />
              <div className="print-slot" />
              {stage === "printing" && savedStrip ? <div className="printing-paper-window"><img className={`printing-paper${paperReady ? " ready" : ""}`} src={savedStrip.previewUrl} width={225} height={646} alt="Your finished photo strip" onLoad={() => { setPaperReady(true); if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPrinted(true); }} onError={() => { setPrinted(true); setError("The preview couldn’t load. You can still download or open your strip below."); }} onAnimationEnd={() => setPrinted(true)} /></div> : <div className="sample-strip">{[0, 1, 2, 3].map(i => <div className={`sample-frame sample-${i}`} key={i}><span>☺</span><span>☺</span></div>)}</div>}
            </div>
          </div>
          <div className="booth-base" />
        </div>
        <div className="floor-shadow" aria-hidden="true" />
      </div>
      {stage === "printing" && savedStrip && <div className="printing-message">
        {error && <p className="error" role="alert">{error}</p>}
        <p role="status" aria-live="polite">{printed ? "Your memories are ready." : "Printing your little memories…"}</p>
        <div className="save-help"><p>Your download is starting. <a href={savedStrip.url} download={savedStrip.filename}>Download again</a></p><p><a href={savedStrip.url} target="_blank" rel="noopener noreferrer">Open your photo strip</a></p></div>
        <button className="text-button" onClick={retake}><RotateCcw size={15} /> Let’s take another</button>
        <button className="text-button" onClick={leave}><ArrowLeft size={15} /> Back to booth</button>
      </div>}
    </section> : <section className="session">
      <div className="session-heading"><button className="text-button" onClick={leave} disabled={shooting || connecting}><ArrowLeft size={16} /> Leave booth</button><span className="eyebrow">{stage === "camera" ? "01 / YOUR FOUR POSES" : "02 / THE FINISHING TOUCHES"}</span></div>
      <div className="session-title"><h1>{stage === "camera" ? "Okay, squeeze in." : "That’s a keeper."}</h1><p>{stage === "camera" ? "Three seconds to pose. Four photos to be yourself." : "Pick a finish, choose your paper, leave a little note."}</p></div>
      {stage === "camera" ? <div className="capture-layout"><div className="camera-shell"><div className="camera-top"><span><i /> {started ? "YOU’RE IN THE BOOTH" : "TAKE A SEAT"}</span><span>{shots.length} / 4</span></div><div className="viewport"><video ref={videoRef} playsInline muted style={{ transform: mirror ? "scaleX(-1)" : "none" }} />{!started && <div className="camera-empty"><Camera size={36} /><h2>Let’s see that face.</h2><p>Your browser will ask to use your camera.</p><button className="primary" disabled={connecting} onClick={startCamera}>{connecting ? "Opening camera…" : "Turn on camera"}</button></div>}{count && <div className="countdown" aria-live="assertive">{count}</div>}{flash && <div className="flash" />}</div><div className="controls"><button className="text-button" disabled={shooting} onClick={() => setMirror(value => !value)}><FlipHorizontal size={17} /> Mirror {mirror ? "on" : "off"}</button><button className="primary" onClick={sequence} disabled={!started || shooting}><Camera size={18} />{shooting ? "Hold that pose…" : shots.length ? "Continue photos" : "Take four photos"}</button></div></div><aside className="capture-receipt"><span className="eyebrow">YOUR SESSION</span>{[0, 1, 2, 3].map(i => <div className={`receipt-frame ${shots[i] ? "filled" : ""}`} key={i}>{shots[i] ? <img src={shots[i]} alt={`Pose ${i + 1}`} /> : <><span>0{i + 1}</span><small>{["The warm-up", "The good side", "The silly one", "One for the road"][i]}</small></>}</div>)}<p>Just you, here and now.</p></aside></div> : <div className="finish-layout"><div className="print-desk"><div className="strip" style={{ background: colors.bg, color: colors.ink }}>{shots.map((shot, i) => <div className="slot" key={i}><img src={shot} style={{ filter: FILTERS[filter] }} alt={`Captured pose ${i + 1}`} /></div>)}<div className="strip-caption">{caption}</div><div className="strip-date">{stripDate}</div></div><span className="desk-note">a good day, on paper.</span></div><div className="editor"><div className="setting"><label>01 &nbsp; Photo finish</label><div className="filter-options">{(Object.keys(FILTERS) as FilterKey[]).map(key => <button key={key} aria-pressed={filter === key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)}><img src={shots[0]} style={{ filter: FILTERS[key] }} alt="" /><span>{key === "mono" ? "Black & white" : key}</span></button>)}</div></div><div className="setting"><label>02 &nbsp; Paper colour</label><div className="swatches">{(Object.keys(THEMES) as ThemeKey[]).map(key => <button key={key} aria-pressed={theme === key} onClick={() => setTheme(key)} className={theme === key ? "selected" : ""}><i style={{ background: THEMES[key].bg }} /><span>{THEMES[key].name}</span></button>)}</div></div><div className="setting"><label htmlFor="caption">03 &nbsp; A little note</label><input id="caption" maxLength={34} value={caption} onChange={event => setCaption(event.target.value)} /><small>{caption.length}/34</small></div><button className="primary save" disabled={saving} onClick={download}><Download size={18} />{saving ? "Saving…" : "Keep your photo strip"}</button>{savedStrip && <div className="save-help" role="status"><p>If your download didn’t start, <a href={savedStrip.url} download={savedStrip.filename}>tap here to download</a>.</p><p>Or <a href={savedStrip.url} target="_blank" rel="noopener noreferrer">open your image</a> and touch and hold it to save.</p></div>}<button className="text-button retake" onClick={retake} disabled={saving}><RotateCcw size={15} /> Let’s take another</button></div></div>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>}
  </main>;
}
