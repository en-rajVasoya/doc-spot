// import { useRef, useState, useEffect } from "react";

// function AudioViewer({ file }) {
//     const BASE_URL = import.meta.env.VITE_API_URL;
//     const audioUrl = `${BASE_URL}/files${file.storagePath}`;

//     const audioRef = useRef(null);

//     const [isPlaying, setIsPlaying] = useState(false);
//     const [currentTime, setCurrentTime] = useState(0);
//     const [duration, setDuration] = useState(0);

//     const togglePlay = () => {
//         const audio = audioRef.current;
//         if (audio.paused) {
//             audio.play();
//             setIsPlaying(true);
//         } else {
//             audio.pause();
//             setIsPlaying(false);
//         }
//     };

//     const handleTimeUpdate = () => {
//         setCurrentTime(audioRef.current.currentTime);
//     };

//     const handleLoadedMetadata = () => {
//         setDuration(audioRef.current.duration);
//     };

//     const handleSeek = (e) => {
//         const rect = e.currentTarget.getBoundingClientRect();
//         const percent = (e.clientX - rect.left) / rect.width;
//         audioRef.current.currentTime = percent * duration;
//     };

//     // keyboard
//     useEffect(() => {
//         const handleKey = (e) => {
//             if (e.key === " ") {
//                 e.preventDefault();
//                 togglePlay();
//             }
//         };
//         window.addEventListener("keydown", handleKey);
//         return () => window.removeEventListener("keydown", handleKey);
//     }, []);

//     const formatTime = (sec) => {
//         const m = Math.floor(sec / 60);
//         const s = Math.floor(sec % 60);
//         return `${m}:${s.toString().padStart(2, "0")}`;
//     };

//     const progress = duration ? (currentTime / duration) * 100 : 0;

//     return (
//         <div className="audio-player-container">

//             {/* hidden audio */}
//             <audio
//                 ref={audioRef}
//                 src={audioUrl}
//                 onTimeUpdate={handleTimeUpdate}
//                 onLoadedMetadata={handleLoadedMetadata}
//             />

//             {/* MAIN CARD */}
//             <div className="audio-card">

//                 {/* ICON / VISUAL */}
//                 <div className="audio-visual">
//                     <div className={`pulse ${isPlaying ? "active" : ""}`} />
//                     <div className="audio-icon">🎵</div>
//                 </div>

//                 {/* FILE NAME */}
//                 <div className="audio-title">
//                     {file.name}
//                 </div>

//                 {/* PLAY BUTTON */}
//                 <div className="audio-main-btn" onClick={togglePlay}>
//                     {isPlaying ? "❚❚" : "▶"}
//                 </div>

//                 {/* PROGRESS */}
//                 <div className="audio-progress" onClick={handleSeek}>
//                     <div
//                         className="audio-progress-filled"
//                         style={{ width: `${progress}%` }}
//                     />
//                 </div>

//                 {/* TIME */}
//                 <div className="audio-time">
//                     {formatTime(currentTime)} / {formatTime(duration)}
//                 </div>

//             </div>
//         </div>
//     );
// }

// export default AudioViewer;








import { useEffect, useRef, useState } from "react";
import InteractiveIcon from "../../layout/InteractiveIcon";
import retryAudioRightIcon from "@images/icon/retry-audio-right-icon.svg";
import retryAudioLeftIcon from "@images/icon/retry-audio-left-icon.svg";



const fmt = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function AudioViewer({ file }) {
  const src = file?.url || (file?.storagePath ? `${file.storagePath}` : "");

  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const handlers = {
      timeupdate: () => setCurrent(a.currentTime),
      loadedmetadata: () => setDuration(a.duration),
      ended: () => setPlaying(false),
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
    };
    Object.entries(handlers).forEach(([e, h]) => a.addEventListener(e, h));
    return () => Object.entries(handlers).forEach(([e, h]) => a.removeEventListener(e, h));
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (a.paused) a.play(); else a.pause();
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const skip = (s) => { audioRef.current.currentTime = Math.max(0, Math.min(current + s, duration)); };

  const handleVolume = (e) => {
    const v = +e.target.value;
    setVolume(v); audioRef.current.volume = v; setMuted(v === 0);
  };

  const toggleMute = () => {
    audioRef.current.muted = !muted; setMuted(!muted);
  };

  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next); audioRef.current.playbackRate = next;
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const ext = (file?.name || "").split(".").pop().toUpperCase();

  return (
    <>

      <div className="audio-preview-root">


        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Spinning disc */}
        <div className="audio-preview-disc">
          <div className={`audio-preview-spin ${playing ? "playing" : ""}`} >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="audio-preview-disc-line"
                style={{
                  transform: `rotate(${i * 45}deg) translateX(-1px) translateY(-56px)`,
                }}
              />
            ))}
          </div>
          <div className="audio-preview-disc-inner">
            <svg width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          </div>
        </div>

        {/* Title */}
        <div className="audio-preview-meta">
          <div className="audio-preview-title mute-text">{file?.name || "Audio File"}</div>
          <div className="audio-preview-sub  mute-text">{ext} · {fmt(duration)}</div>
        </div>

        {/* Progress */}
        <div className="audio-preview-progress-wrap">
          <div className="audio-preview-bar" onClick={seek}>
            <div className="audio-preview-fill" style={{ width: `${pct}%` }} />
            <div className="audio-preview-thumb" style={{ left: `${pct}%` }} />
          </div>
          <div className="audio-preview-times"><span className="mute-text">{fmt(current)}</span><span className="mute-text">{fmt(duration)}</span></div>
        </div>

        {/* Controls */}
        <div className="audio-preview-controls">
          <button className="new-preview-zoom-controls-sub" title="-10s" onClick={() => skip(-10)}>
            <InteractiveIcon
              defaultIcon={retryAudioLeftIcon}
              width={24}
              alt=""
            />
          </button>
          <button className="new-preview-zoom-controls-sub" onClick={togglePlay}>
            {playing
              ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              : <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            }
          </button>
          <button className="new-preview-zoom-controls-sub" title="+10s" onClick={() => skip(10)}>
            <InteractiveIcon
              defaultIcon={retryAudioRightIcon}
              width={24}
              alt=""
            />
          </button>
        </div>

        {/* Volume + speed */}
        <div className="audio-preview-vol-row">
          <button className="new-preview-zoom-controls-sub " onClick={toggleMute}>
            {muted || volume === 0
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            }
          </button>
          <input className="audio-preview-vol" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolume} />
          <button className="audio-preview-speed new-preview-zoom-controls-sub " onClick={cycleSpeed}>{speed}x</button>
        </div>
      </div>
    </>
  );
}