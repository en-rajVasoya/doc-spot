// import { useEffect, useRef, useState } from "react";
// import { useDownload } from "../../../context/DownloadContext.jsx";
// import InteractiveIcon from "../../layout/InteractiveIcon";
// import plusIcon from "@images/icon/plus.svg";
// import nagativIcon from "@images/icon/negativ-icon.svg";
// import magnificationIcon from "@images/icon/magnification-icon.svg";
// import imgIcon from "@images/svgs/media/img-file.svg";
// import downloadIcon from "@images/icon/download.svg";

// const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// export default function ImageViewer({ file }) {
//     const src =
//         file?.url ||
//         (file?.storagePath ? `${file.storagePath}` : "");

//     const { downloadFile } = useDownload();

//     const [scale, setScale] = useState(1);
//     const [pos, setPos] = useState({ x: 0, y: 0 });
//     const [drag, setDrag] = useState(false);
//     const [loaded, setLoaded] = useState(false);
//     const [err, setErr] = useState(false);
//     const [fitScale, setFitScale] = useState(1);
//     const [tooBig, setTooBig] = useState(false);

//     const containerRef = useRef(null);
//     const dragRef = useRef({ x: 0, y: 0 });
//     const imgRef = useRef(null);

//     const PADDING = 50;

//     const clampScale = (n) => Math.min(Math.max(+n.toFixed(2), 0.03), 3);

//     const calcFitScale = () => {
//         const img = imgRef.current;
//         const container = containerRef.current;
//         if (!img || !container) return 1;
//         const containerW = container.clientWidth - PADDING * 2;
//         const containerH = container.clientHeight - PADDING * 2;
//         const imgW = img.naturalWidth;
//         const imgH = img.naturalHeight;
//         if (!imgW || !imgH) return 1;
//         const fit = Math.min(containerW / imgW, containerH / imgH);
//         return fit >= 1 ? 1 : clampScale(fit);
//     };

//     // ── File change hone par reset + size check ──
//     useEffect(() => {
//         setScale(1);
//         setFitScale(1);
//         setPos({ x: 0, y: 0 });
//         setLoaded(false);
//         setErr(false);
//         setTooBig(false);

//         if (!src) return;

//         // 1. file.size available hai toh direct check
//         if (file?.size && file.size > MAX_SIZE) {
//             setTooBig(true);
//             return;
//         }

//         // 2. file.size nahi hai — HEAD request se content-length lo
//         if (!file?.size) {
//             fetch(src, { method: "HEAD" })
//                 .then(r => {
//                     const size = Number(r.headers.get("content-length") || 0);
//                     if (size > MAX_SIZE) {
//                         setTooBig(true);
//                     }
//                 })
//                 .catch(() => {
//                     // HEAD fail — normal load karne do
//                 });
//         }
//     }, [file, src]);

//     // ── Wheel zoom ───────────────────────────────
//     useEffect(() => {
//         const el = containerRef.current;
//         if (!el) return;
//         const handleWheel = (e) => {
//             e.preventDefault();
//             const delta = e.deltaY < 0 ? 0.1 : -0.1;
//             setScale((prev) => {
//                 const next = clampScale(prev + delta);
//                 if (next <= fitScale) {
//                     setPos({ x: 0, y: 0 });
//                 } else if (prev > fitScale) {
//                     // Smoothly scale down the drag position offset proportionally to the zoom change
//                     const ratio = (next - fitScale) / (prev - fitScale);
//                     setPos((p) => ({
//                         x: p.x * ratio,
//                         y: p.y * ratio
//                     }));
//                 }
//                 return next;
//             });
//         };
//         el.addEventListener("wheel", handleWheel, { passive: false });
//         return () => el.removeEventListener("wheel", handleWheel);
//     }, [fitScale]);

//     // ── Resize ───────────────────────────────────
//     useEffect(() => {
//         if (!loaded) return;
//         const handleResize = () => {
//             const newFit = calcFitScale();
//             setFitScale(newFit);
//             setScale(newFit);
//             setPos({ x: 0, y: 0 });
//         };
//         window.addEventListener("resize", handleResize);
//         return () => window.removeEventListener("resize", handleResize);
//     }, [loaded]);

//     const handleLoad = () => {
//         setLoaded(true);
//         const newFit = calcFitScale();
//         setFitScale(newFit);
//         setScale(newFit);
//         setPos({ x: 0, y: 0 });
//     };

//     const reset = () => {
//         const isFitView = Math.abs(scale - fitScale) < 0.1
//         if (isFitView) {
//             setScale(1)
//         } else {
//             setScale(fitScale)
//             setPos({ x: 0, y: 0 })  // ← add this
//         }
//     }
//     const zoom = (delta) => {
//         setScale((prev) => {
//             const next = clampScale(prev + delta);

//             if (next <= fitScale) {
//                 setPos({ x: 0, y: 0 });
//             } else if (prev > fitScale) {
//                 // Smoothly scale down the drag position offset proportionally to the zoom change
//                 const ratio = (next - fitScale) / (prev - fitScale);
//                 setPos((p) => ({
//                     x: p.x * ratio,
//                     y: p.y * ratio
//                 }));
//             }

//             return next;
//         });
//     };

//     const onDown = (e) => {
//         e.preventDefault();
//         setDrag(true);
//         dragRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
//     };

//     const onMove = (e) => {

//         if (!drag) return;

//         const container = containerRef.current;
//         const img = imgRef.current;

//         if (!container || !img) return;

//         const rect = img.getBoundingClientRect();

//         const imgW = rect.width;
//         const imgH = rect.height;

//         const containerW = container.clientWidth;
//         const containerH = container.clientHeight;

//         // Allow only 50% image outside
//         const maxX = imgW / 2;
//         const maxY = imgH / 2;

//         const nextX = e.clientX - dragRef.current.x;
//         const nextY = e.clientY - dragRef.current.y;

//         setPos({
//             x: Math.min(maxX, Math.max(-maxX, nextX)),
//             y: Math.min(maxY, Math.max(-maxY, nextY)),
//         });
//     };

//     const tf = `translate(${pos.x}px,${pos.y}px) scale(${scale})`;

//     const fileSizeMB = file?.size
//         ? (file.size / (1024 * 1024)).toFixed(1)
//         : null;

//     // ── Too Big UI ───────────────────────────────
//     if (tooBig) return (
//         <div className="preview-toobig">
//             <div className="txt-toobig-icon">
//                 <InteractiveIcon
//                     defaultIcon={imgIcon}
//                     width={36}
//                     height={42}
//                     alt=""
//                 />
//             </div>
//             <p className="preview-toobig-title m-0">File too large to preview</p>
//             <p className="mute-text">
//                 {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
//                 Files larger than 50 MB cannot be previewed.
//             </p>
//             <button
//                 className="preview-btn preview-btn-text"
//                 onClick={() => downloadFile(file)}
//             >
//                 <InteractiveIcon
//                     defaultIcon={downloadIcon}
//                     width={24}
//                     height={24}
//                     alt=""
//                 />
//                 Download
//             </button>
//         </div>
//     );

//     // ── Normal viewer ────────────────────────────
//     return (
//         <div
//             ref={containerRef}
//             className="image-preview-root"
//             onMouseDown={onDown}
//             onMouseMove={onMove}
//             onMouseUp={() => setDrag(false)}
//             onMouseLeave={() => setDrag(false)}
//             style={{
//                 cursor: drag ? "grabbing" : "grab",
//                 overflow: "hidden",
//             }}
//         >
//             {/* Loading */}
//             {!loaded && !err && (
//                 <div className="cma-messages-are-loader-wrapper">
//                     <span className="loader"></span>
//                 </div>
//             )}

//             {/* Error */}
//             {err && (
//                 <div className="preview-error">Error</div>
//             )}

//             {/* Image */}
//             <img
//                 ref={imgRef}
//                 src={src}
//                 alt={file?.name}
//                 draggable={false}
//                 className="image-preview-img"
//                 style={{
//                     transform: tf,
//                     transition: drag
//                         ? "none"
//                         : "transform .18s cubic-bezier(.25,.46,.45,.94)",
//                     opacity: loaded ? 1 : 0,
//                     maxWidth: "none",
//                     maxHeight: "none",
//                 }}
//                 onLoad={handleLoad}
//                 onError={() => setErr(true)}
//             />

//             {/* Zoom controls */}
//             <div className="image-preview-bar">
//                 <div className="new-preview-zoom-controls-sub after-line-horizontal">
//                     <button
//                         className="image-preview-btn"
//                         onClick={() => zoom(scale > 1 ? -0.25 : -0.05)}
//                         disabled={scale <= 0.03}
//                         style={{
//                             opacity: scale <= 0.03 ? 0.35 : 1,
//                             cursor: scale <= 0.05 ? "not-allowed" : "pointer" // <-- Show not-allowed cursor
//                         }}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={nagativIcon}
//                             width={24}
//                             alt=""
//                             customStyle={{ cursor: scale <= 0.05 ? "not-allowed" : "pointer" }} // <-- Override internal pointer cursor
//                         />
//                     </button>
//                     <button
//                         className="image-preview-btn"
//                         onClick={() => zoom(scale >= 1 ? 0.25 : 0.05)}
//                         disabled={scale >= 5}
//                         style={{
//                             opacity: scale >= 5 ? 0.35 : 1,
//                             cursor: scale >= 5 ? "not-allowed" : "pointer" // <-- Show not-allowed cursor
//                         }}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={plusIcon}
//                             width={24}
//                             alt=""
//                             customStyle={{ cursor: scale >= 5 ? "not-allowed" : "pointer" }} // <-- Override internal pointer cursor
//                         />
//                     </button>
//                 </div>
//                 <div className="new-preview-zoom-controls-sub">
//                     <button className="image-preview-btn" onClick={reset}>
//                         <InteractiveIcon defaultIcon={magnificationIcon} width={24} alt="" />
//                     </button>
//                 </div>
//             </div>

//         </div>
//     );
// }

import { useEffect, useRef, useState } from "react";
import fileIcon from "@images/svgs/file.svg"
import InteractiveIcon from "../../layout/InteractiveIcon";
import plusIcon from "@images/icon/plus.svg";
import nagativIcon from "@images/icon/negativ-icon.svg";
import magnificationIcon from "@images/icon/magnification-icon.svg";
import imgIcon from "@images/svgs/media/img-file.svg";
import downloadIcon from "@images/icon/download.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";
import magnificationIconNegative from "@images/icon/magnification-icon-negative.svg";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const clampScale = (n) => Math.min(Math.max(+n.toFixed(2), 0.05), 3);

export default function ImageViewer({ file }) {
    const { downloadFile } = useDownload();
    const BASE_URL = import.meta.env.VITE_API_URL;
    const src =
        file?.url ||
        (file?.storagePath ? `${file.storagePath}` : "");

    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [drag, setDrag] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState(true);
    const [fitScale, setFitScale] = useState(1);
    const [tooBig, setTooBig] = useState(false);

    const containerRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0 });
    const imgRef = useRef(null);

    const PADDING = 50;

    const calcFitScale = () => {
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container) return 1;
        const containerW = container.clientWidth - PADDING * 2;
        const containerH = container.clientHeight - PADDING * 2;
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        if (!imgW || !imgH) return 1;
        const fit = Math.min(containerW / imgW, containerH / imgH);
        return fit >= 1 ? 1 : clampScale(fit);
    };

    // Reset state when file changes
    useEffect(() => {
        setScale(1);
        setFitScale(1);
        setPos({ x: 0, y: 0 });
        setLoaded(false);
        setReady(false);
        setErr(false);
        setTooBig(false);

        if (!src) return;

        const currentSize = file?.size || file?.fileSize;
        if (currentSize && currentSize > MAX_SIZE) {
            setTooBig(true);
            return;
        }

        if (!currentSize) {
            fetch(src, { method: "HEAD" })
                .then(r => {
                    const size = Number(r.headers.get("content-length") || 0);
                    if (size > MAX_SIZE) {
                        setTooBig(true);
                    }
                })
                .catch(() => { });
        }
    }, [file, src]);

    // Wheel zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !ready) return;
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            setScale((prev) => {
                const next = clampScale(prev + delta);
                if (next <= fitScale) {
                    setPos({ x: 0, y: 0 });
                } else if (prev > fitScale) {
                    const ratio = next / prev;
                    setPos((p) => ({
                        x: p.x * ratio,
                        y: p.y * ratio
                    }));
                }
                return next;
            });
        };
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [fitScale, ready]);

    // Recalculate fit on window resize
    useEffect(() => {
        if (!loaded) return;
        const handleResize = () => {
            const newFit = calcFitScale();
            setFitScale(newFit);
            setScale(newFit);
            setPos({ x: 0, y: 0 });
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [loaded]);

    const handleLoad = () => {
        setLoaded(true);

        requestAnimationFrame(() => {
            const newFit = calcFitScale(); // calculate AFTER layout is painted
            setFitScale(newFit);
            setScale(newFit);
            setPos({ x: 0, y: 0 });

            requestAnimationFrame(() => {
                setReady(true); // reveal AFTER scale is committed
            });
        });
    };

    const reset = () => {
        // If image is small (fitScale is 1), toggle between 1x and 3x
        if (Math.abs(fitScale - 1) < 0.01) {
            const isOriginal = Math.abs(scale - 1) < 0.01;
            if (isOriginal) {
                setScale(3);
                setPos({ x: 0, y: 0 });
            } else {
                setScale(1);
                setPos({ x: 0, y: 0 });
            }
        } else {
            // Otherwise, toggle between fit-to-screen and 100% size
            const isFitView = Math.abs(scale - fitScale) < 0.01;
            if (isFitView) {
                setScale(1);
                setPos({ x: 0, y: 0 });
            } else {
                setScale(fitScale);
                setPos({ x: 0, y: 0 });
            }
        }
    };

    const zoom = (delta) => {
        setScale((prev) => {
            const next = clampScale(prev + delta);
            if (next <= fitScale) {
                setPos({ x: 0, y: 0 });
            } else if (prev > fitScale) {
                const ratio = next / prev;
                setPos((p) => ({
                    x: p.x * ratio,
                    y: p.y * ratio
                }));
            }
            return next;
        });
    };

    const onDown = (e) => {
        e.preventDefault();
        setDrag(true);
        dragRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    const onMove = (e) => {
        if (!drag) return;
        const container = containerRef.current;
        const img = imgRef.current;
        if (!container || !img) return;
        const rect = img.getBoundingClientRect();
        const imgW = rect.width;
        const imgH = rect.height;
        const maxX = imgW / 2;
        const maxY = imgH / 2;
        const nextX = e.clientX - dragRef.current.x;
        const nextY = e.clientY - dragRef.current.y;
        setPos({
            x: Math.min(maxX, Math.max(-maxX, nextX)),
            y: Math.min(maxY, Math.max(-maxY, nextY)),
        });
    };

    const tf = `translate(${pos.x}px,${pos.y}px) scale(${scale})`;

    const currentSizeDisplay = file?.size || file?.fileSize || 0;
    const fileSizeMB = currentSizeDisplay
        ? (currentSizeDisplay / (1024 * 1024)).toFixed(1)
        : null;

    const handleDownload = () => {
        downloadFile(file);
    };

    // File too large or error
    if (tooBig || err) return (
        <div className="preview-toobig">
            <div className="txt-toobig-icon">
                <img src={fileIcon} alt="" width={38} />
            </div>
            <p className="preview-toobig-title m-0">
                {tooBig ? "File too large to preview" : "Preview unavailable"}
            </p>
            <p className="mute-text">
                {tooBig ? (
                    <>
                        {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
                        Files larger than 50 MB cannot be previewed.
                    </>
                ) : (
                    "We couldn't load a preview for this file. Please download it."
                )}
            </p>
            <button className="preview-btn preview-btn-text" onClick={handleDownload}>
                <InteractiveIcon
                    defaultIcon={downloadIcon}
                    width={20}
                    height={20}
                    alt=""
                />
                Download
            </button>
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="image-preview-root"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={() => setDrag(false)}
            onMouseLeave={() => setDrag(false)}
            style={{
                cursor: drag ? "grabbing" : "grab",
                overflow: "hidden",
            }}
        >

            {!ready && !err && (
                <div className="loader-wrapper-box">
                    <div className="cma-messages-are-loader-wrapper">
                        <span className="loader"></span>
                    </div>
                </div>
            )}


            <img
                ref={imgRef}
                src={src}
                alt={file?.name}
                draggable={false}
                className="image-preview-img"
                style={{
                    transform: tf,

                    transition: (!ready || drag) ? "none" : "transform .18s cubic-bezier(.25,.46,.45,.94)",
                    opacity: ready ? 1 : 0,
                    maxWidth: "none",
                    maxHeight: "none",
                    position: ready ? "relative" : "absolute",
                    pointerEvents: ready ? "auto" : "none",
                    visibility: ready ? "visible" : "hidden",
                }}
                onLoad={handleLoad}
                onError={() => setErr(true)}
            />

            {/* Zoom controls */}
            <div className="image-preview-bar">
                <div className="new-preview-zoom-controls-sub after-line-horizontal">
                    <button
                        className="image-preview-btn"
                        onClick={() => zoom(scale > 1 ? -0.25 : -0.05)}
                        disabled={scale <= 0.05}
                        style={{
                            opacity: scale <= 0.05 ? 0.35 : 1,
                            cursor: scale <= 0.05 ? "not-allowed" : "pointer"
                        }}
                    >
                        <InteractiveIcon
                            defaultIcon={nagativIcon}
                            width={24}
                            alt=""
                            customStyle={{ cursor: scale <= 0.05 ? "not-allowed" : "pointer" }}
                        />
                    </button>
                    <button
                        className="image-preview-btn"
                        onClick={() => zoom(scale >= 1 ? 0.25 : 0.05)}
                        disabled={scale >= 3}
                        style={{
                            opacity: scale >= 3 ? 0.35 : 1,
                            cursor: scale >= 3 ? "not-allowed" : "pointer"
                        }}
                    >
                        <InteractiveIcon
                            defaultIcon={plusIcon}
                            width={24}
                            alt=""
                            customStyle={{ cursor: scale >= 5 ? "not-allowed" : "pointer" }}
                        />
                    </button>
                </div>
                <div className="new-preview-zoom-controls-sub">
                    <button className="image-preview-btn" onClick={reset}>
                        <InteractiveIcon defaultIcon={scale > fitScale + 0.01 ? magnificationIconNegative : magnificationIcon} width={24} alt="" />
                    </button>
                </div>
            </div>
        </div>
    );
}