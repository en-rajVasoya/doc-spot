// import { useRef, useState, useEffect } from "react"

// function VideoViewer({ file }) {
//     const BASE_URL = import.meta.env.VITE_API_URL
//     const videoUrl = `${BASE_URL}/files${file.storagePath}`

//     const videoRef = useRef(null)
//     const progressRef = useRef(null)

//     const [isPlaying, setIsPlaying] = useState(false)
//     const [currentTime, setCurrentTime] = useState(0)
//     const [duration, setDuration] = useState(0)
//     const [volume, setVolume] = useState(1)
//     const [isMuted, setIsMuted] = useState(false)
//     const [isFullscreen, setIsFullscreen] = useState(false)

//     const togglePlay = () => {
//         if (videoRef.current.paused) {
//             videoRef.current.play()
//             setIsPlaying(true)
//         } else {
//             videoRef.current.pause()
//             setIsPlaying(false)
//         }
//     }

//     const handleTimeUpdate = () => {
//         setCurrentTime(videoRef.current.currentTime)
//     }

//     const handleLoadedMetadata = () => {
//         setDuration(videoRef.current.duration)
//     }

//     const handleSeek = (e) => {
//         const rect = progressRef.current.getBoundingClientRect()
//         const percent = (e.clientX - rect.left) / rect.width
//         videoRef.current.currentTime = percent * duration
//     }

//     const handleVolume = (e) => {
//         const val = parseFloat(e.target.value)
//         videoRef.current.volume = val
//         setVolume(val)
//         setIsMuted(val === 0)
//     }

//     const toggleMute = () => {
//         videoRef.current.muted = !isMuted
//         setIsMuted(!isMuted)
//     }

//     const toggleFullscreen = () => {
//         if (!document.fullscreenElement) {
//             videoRef.current.requestFullscreen()
//             setIsFullscreen(true)
//         } else {
//             document.exitFullscreen()
//             setIsFullscreen(false)
//         }
//     }

//     const formatTime = (sec) => {
//         const m = Math.floor(sec / 60)
//         const s = Math.floor(sec % 60)
//         return `${m}:${s.toString().padStart(2, "0")}`
//     }

//     const progressPercent = duration ? (currentTime / duration) * 100 : 0

//     return (
//         <div className="video-viewer">

//             <video
//                 ref={videoRef}
//                 src={videoUrl}
//                 className="video-element"
//                 onTimeUpdate={handleTimeUpdate}
//                 onLoadedMetadata={handleLoadedMetadata}
//                 onEnded={() => setIsPlaying(false)}
//                 onClick={togglePlay}
//             />

//             <div className="video-controls">

//                 {/* PROGRESS BAR */}
//                 <div
//                     ref={progressRef}
//                     className="video-progress"
//                     onClick={handleSeek}
//                 >
//                     <div
//                         className="video-progress-filled"
//                         style={{ width: `${progressPercent}%` }}
//                     />
//                 </div>

//                 <div className="video-controls-row">

//                     {/* PLAY PAUSE */}
//                     <button className="video-btn" onClick={togglePlay}>
//                         {isPlaying ? (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                                 <rect x="6" y="4" width="4" height="16" />
//                                 <rect x="14" y="4" width="4" height="16" />
//                             </svg>
//                         ) : (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                                 <polygon points="5,3 19,12 5,21" />
//                             </svg>
//                         )}
//                     </button>

//                     {/* TIME */}
//                     <span className="video-time">
//                         {formatTime(currentTime)} / {formatTime(duration)}
//                     </span>

//                     <div style={{ flex: 1 }} />

//                     {/* MUTE */}
//                     <button className="video-btn" onClick={toggleMute}>
//                         {isMuted || volume === 0 ? (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
//                                 <line x1="23" y1="9" x2="17" y2="15" />
//                                 <line x1="17" y1="9" x2="23" y2="15" />
//                             </svg>
//                         ) : (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
//                                 <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
//                                 <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
//                             </svg>
//                         )}
//                     </button>

//                     {/* VOLUME SLIDER */}
//                     <input
//                         type="range"
//                         min="0"
//                         max="1"
//                         step="0.05"
//                         value={isMuted ? 0 : volume}
//                         onChange={handleVolume}
//                         className="video-volume"
//                     />

//                     {/* FULLSCREEN */}
//                     <button className="video-btn" onClick={toggleFullscreen}>
//                         {isFullscreen ? (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path d="M8,3V6a2,2,0,0,1-2,2H3" />
//                                 <path d="M21,8H18a2,2,0,0,1-2-2V3" />
//                                 <path d="M3,16H6a2,2,0,0,1,2,2v3" />
//                                 <path d="M16,21V18a2,2,0,0,1,2-2h3" />
//                             </svg>
//                         ) : (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path d="M8,3H5A2,2,0,0,0,3,5V8" />
//                                 <path d="M21,8V5a2,2,0,0,0-2-2H16" />
//                                 <path d="M3,16v3a2,2,0,0,0,2,2H8" />
//                                 <path d="M16,21h3a2,2,0,0,0,2-2V16" />
//                             </svg>
//                         )}
//                     </button>

//                 </div>
//             </div>
//         </div>
//     )
// }

// export default VideoViewer




import { useEffect, useRef, useState } from "react";
import { useDownload } from "../../../context/DownloadContext.jsx";
import InteractiveIcon from "../../layout/InteractiveIcon";
import videoIcon   from "@images/svgs/media/video-file.svg";
import downloadIcon from "@images/icon/download.svg";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

const fmt = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoViewer({ file }) {
  const src = file?.url ||
    (file?.storagePath ? `${file.storagePath}` : "");

  const { downloadFile } = useDownload();

  const videoRef = useRef();
  const hideTimer = useRef();

  const [playing, setPlaying]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume]     = useState(1);
  const [muted, setMuted]       = useState(false);
  const [speed, setSpeed]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [controls, setControls] = useState(true);
  const [playHint, setPlayHint] = useState(false);
  const [tooBig, setTooBig]     = useState(false);
  const [err, setErr]           = useState(false);

  // ── Size check on mount ──────────────────────
  useEffect(() => {
    setTooBig(false);
    setErr(false);
    setLoading(true);

    if (!src) return;

    // 1. file.size se direct check
    if (file?.size && file.size > MAX_SIZE) {
      setTooBig(true);
      setLoading(false);
      return;
    }

    // 2. file.size nahi hai — HEAD request se check
    if (!file?.size) {
      fetch(src, { method: "HEAD" })
        .then(r => {
          const size = Number(r.headers.get("content-length") || 0);
          if (size > MAX_SIZE) {
            setTooBig(true);
            setLoading(false);
          }
        })
        .catch(() => {
          // HEAD fail — normal load karne do
        });
    }
  }, [file, src]);

  // ── Video event listeners ────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handlers = {
      timeupdate: () => {
        setCurrent(v.currentTime);
        if (v.buffered.length)
          setBuffered(v.buffered.end(v.buffered.length - 1));
      },
      loadedmetadata: () => { setDuration(v.duration); setLoading(false); },
      waiting:        () => setLoading(true),
      canplay:        () => setLoading(false),
      ended:          () => { setPlaying(false); setControls(true); },
      play:           () => setPlaying(true),
      pause:          () => setPlaying(false),
      error:          () => { setErr(true); setLoading(false); },
    };

    Object.entries(handlers).forEach(([e, h]) => v.addEventListener(e, h));
    return () =>
      Object.entries(handlers).forEach(([e, h]) => v.removeEventListener(e, h));
  }, []);

  const showControls = () => {
    setControls(true);
    clearTimeout(hideTimer.current);
    if (playing)
      hideTimer.current = setTimeout(() => setControls(false), 3000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (v.paused) v.play(); else v.pause();
    setPlayHint(true);
    setTimeout(() => setPlayHint(false), 500);
    showControls();
  };

  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    videoRef.current.playbackRate = next;
  };

  const handleVolume = (e) => {
    const v = +e.target.value;
    setVolume(v);
    videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const fileSizeMB = file?.size
    ? (file.size / (1024 * 1024)).toFixed(1)
    : null;

  // ── Too Big UI ───────────────────────────────
  if (tooBig) return (
    <div className="preview-toobig">
      <div className="txt-toobig-icon">
        <InteractiveIcon
          defaultIcon={videoIcon}
          width={36}
          height={42}
          alt=""
        />
      </div>
      <p className="preview-toobig-title m-0">File too large to preview</p>
      <p className="mute-text">
        {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
        Files larger than 100 MB cannot be previewed.
      </p>
      <button
        className="preview-btn preview-btn-text"
        onClick={() => downloadFile(file)}
      >
        <InteractiveIcon
          defaultIcon={downloadIcon}
          width={24}
          height={24}
          alt=""
        />
        Download
      </button>
    </div>
  );

  // ── Error UI ─────────────────────────────────
  if (err) return (
    <div className="preview-toobig">
      <div className="txt-toobig-icon">
        <InteractiveIcon
          defaultIcon={videoIcon}
          width={36}
          height={42}
          alt=""
        />
      </div>
      <p className="preview-toobig-title m-0">Could not load video</p>
      <p className="mute-text">
        This file could not be played. Download it to watch on your device.
      </p>
      <button
        className="preview-btn preview-btn-text"
        onClick={() => downloadFile(file)}
      >
        <InteractiveIcon
          defaultIcon={downloadIcon}
          width={24}
          height={24}
          alt=""
        />
        Download
      </button>
    </div>
  );

  // ── Normal viewer ────────────────────────────
  return (
    <div className="video-preview-root-wrapper">
      <div
        className="video-preview-root"
        onMouseMove={showControls}
        onMouseLeave={() => playing && setControls(false)}
      >
        {loading && (
          <div className="video-preview-loading">
            <div className="video-preview-spinner" />
          </div>
        )}

        <video
          ref={videoRef}
          src={src}
          className="video-preview-video"
          preload="metadata"
          controls
          autoPlay
        />
      </div>
    </div>
  );
}