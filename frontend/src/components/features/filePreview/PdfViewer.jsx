// import { memo, useEffect, useRef, useState, useCallback } from "react"
// import { Virtuoso } from "react-virtuoso"
// import * as pdfjsLib from "pdfjs-dist"
// import "pdfjs-dist/web/pdf_viewer.css"
// import InteractiveIcon from "../../layout/InteractiveIcon"
// import plusIcon from "@images/icon/plus.svg"
// import nagativIcon from "@images/icon/negativ-icon.svg"
// import magnificationIcon from "@images/icon/magnification-icon.svg"

// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//     "pdfjs-dist/build/pdf.worker.min.mjs",
//     import.meta.url
// ).toString()

// const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
// const CMAP_PACKED = true

// const PdfPage = memo(function PdfPage({ pdf, pageIndex, scale, isThumb = false, isActivePage = false }) {
//     const canvasRef = useRef(null)
//     const textLayerRef = useRef(null)
//     const renderTaskRef = useRef(null)
//     const textLayerTaskRef = useRef(null)
//     const [pageSize, setPageSize] = useState({ width: 300, height: 400 })
//     const [loadingPage, setLoadingPage] = useState(true)

//     useEffect(() => {
//         if (!pdf) return

//         let cancelled = false
//         setLoadingPage(true)

//         const renderPage = async () => {
//             try {
//                 const page = await pdf.getPage(pageIndex + 1)
//                 if (cancelled) return

//                 const viewport = page.getViewport({ scale })
//                 setPageSize({ width: viewport.width, height: viewport.height })

//                 const canvas = canvasRef.current
//                 if (!canvas) return

//                 const context = canvas.getContext("2d", { alpha: false })
//                 canvas.width = viewport.width
//                 canvas.height = viewport.height

//                 if (renderTaskRef.current) {
//                     renderTaskRef.current.cancel()
//                 }

//                 const renderTask = page.render({
//                     canvasContext: context,
//                     viewport,
//                 })
//                 renderTaskRef.current = renderTask
//                 await renderTask.promise
//                 if (cancelled) return

//                 setLoadingPage(false)

//                 // Text layer is expensive — only for the active main page, after canvas paint
//                 if (!isThumb && isActivePage && textLayerRef.current) {
//                     const renderTextLayer = async () => {
//                         if (cancelled || !textLayerRef.current) return

//                         textLayerRef.current.innerHTML = ""
//                         textLayerRef.current.style.width = `${viewport.width}px`
//                         textLayerRef.current.style.height = `${viewport.height}px`

//                         const textContent = await page.getTextContent()
//                         if (cancelled || !textLayerRef.current) return

//                         const textLayer = new pdfjsLib.TextLayer({
//                             textContentSource: textContent,
//                             container: textLayerRef.current,
//                             viewport,
//                         })
//                         textLayerTaskRef.current = textLayer
//                         await textLayer.render()
//                     }

//                     requestAnimationFrame(() => {
//                         renderTextLayer().catch((err) => {
//                             if (err?.name !== "RenderingCancelledException") {
//                                 console.error(`Page ${pageIndex + 1} text layer error:`, err)
//                             }
//                         })
//                     })
//                 }
//             } catch (err) {
//                 if (err?.name !== "RenderingCancelledException") {
//                     console.error(`Page ${pageIndex + 1} render error:`, err)
//                 }
//                 if (!cancelled) setLoadingPage(false)
//             }
//         }

//         renderPage()

//         return () => {
//             cancelled = true
//             if (renderTaskRef.current) {
//                 renderTaskRef.current.cancel()
//             }
//             if (textLayerRef.current) {
//                 textLayerRef.current.innerHTML = ""
//             }
//         }
//     }, [pdf, pageIndex, scale, isThumb, isActivePage])

//     if (isThumb) {
//         return (
//             <div style={{
//                 position: "relative",
//                 width: "100%",
//                 height: `${pageSize.height}px`,
//                 backgroundColor: "var(--dark-03)",
//                 borderRadius: "4px",
//                 overflow: "hidden"
//             }}>
//                 {loadingPage && (
//                     <div style={{
//                         position: "absolute",
//                         inset: 0,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         backgroundColor: "rgba(255, 255, 255, 0.5)"
//                     }}>
//                         <div className="spinner-border text-primary" role="status" style={{ width: "1.2rem", height: "1.2rem" }} />
//                     </div>
//                 )}
//                 <canvas
//                     ref={canvasRef}
//                     style={{ display: "block", width: "100%", height: "auto" }}
//                 />
//             </div>
//         )
//     }

//     return (
//         <div style={{
//             position: "relative",
//             display: "inline-block",
//             width: `${pageSize.width}px`,
//             height: `${pageSize.height}px`,
//             backgroundColor: "#fff"
//         }}>
//             {loadingPage && (
//                 <div style={{
//                     position: "absolute",
//                     inset: 0,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     backgroundColor: "rgba(255, 255, 255, 0.7)",
//                     zIndex: 2,
//                     pointerEvents: "none"
//                 }}>
//                     <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }} />
//                 </div>
//             )}
//             <canvas ref={canvasRef} style={{ display: "block" }} />
//             {isActivePage && (
//                 <div
//                     ref={textLayerRef}
//                     className="textLayer"
//                     style={{
//                         position: "absolute",
//                         top: 0,
//                         left: 0,
//                         pointerEvents: "auto",
//                         userSelect: "text",
//                         lineHeight: 1,
//                         overflow: "hidden",
//                         zIndex: 1
//                     }}
//                 />
//             )}
//         </div>
//     )
// })

// function PdfViewer({ file: fileData }) {
//     const BASE_URL = import.meta.env.VITE_API_URL
//     const fileUrl = `${BASE_URL}/download/preview/${fileData._id}`

//     const [pdf, setPdf] = useState(null)
//     const [numPages, setNumPages] = useState(0)
//     const [scale, setScale] = useState(1)
//     const [currentPage, setCurrentPage] = useState(0)
//     const [showSidebar, setShowSidebar] = useState(false)
//     const [loading, setLoading] = useState(true)
//     const [loadProgress, setLoadProgress] = useState(0)
//     const [error, setError] = useState(false)

//     const virtuosoRef = useRef(null)
//     const sidebarVirtuosoRef = useRef(null)

//     useEffect(() => {
//         setLoading(true)
//         setError(false)
//         setPdf(null)
//         setNumPages(0)
//         setLoadProgress(0)

//         const loadingTask = pdfjsLib.getDocument({
//             url: fileUrl,
//             withCredentials: true,
//             cMapUrl: CMAP_URL,
//             cMapPacked: CMAP_PACKED,
//             // Backend supports Range requests — stream PDF instead of downloading whole file first
//             disableRange: false,
//             disableStream: false,
//             rangeChunkSize: 65536,
//         })

//         loadingTask.onProgress = ({ loaded, total }) => {
//             if (total > 0) {
//                 setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)))
//             }
//         }

//         loadingTask.promise
//             .then((pdfDoc) => {
//                 setPdf(pdfDoc)
//                 setNumPages(pdfDoc.numPages)
//                 setLoadProgress(100)
//                 setLoading(false)
//             })
//             .catch((err) => {
//                 console.error("PDF load error:", err)
//                 setError(true)
//                 setLoading(false)
//             })

//         return () => {
//             loadingTask.destroy()
//         }
//     }, [fileUrl])

//     const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)

//     const zoomIn = () => setScale((prev) => clampScale(Math.round((prev + 0.2) * 10) / 10))
//     const zoomOut = () => setScale((prev) => clampScale(Math.round((prev - 0.2) * 10) / 10))
//     const resetZoom = () => setScale(1)

//     const handleThumbnailClick = useCallback((index) => {
//         setCurrentPage(index)
//         virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" })
//     }, [])

//     if (loading) {
//         return (
//             <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "var(--dark-100)" }}>
//                 <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
//                 <span style={{ fontWeight: "500" }}>Loading Document...</span>
//                 {loadProgress > 0 && (
//                     <span style={{ fontSize: "13px", marginTop: "8px", opacity: 0.7 }}>
//                         {loadProgress}%
//                     </span>
//                 )}
//             </div>
//         )
//     }

//     if (error) {
//         return (
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "var(--red)" }}>
//                 <span>Failed to load PDF</span>
//             </div>
//         )
//     }

//     return (
//         <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%", position: "relative", overflow: "hidden", paddingTop: "60px" }}>

//             {/* Sidebar — only mount when open so thumbnails are not rendered in background */}
//             {numPages > 0 && showSidebar && (
//                 <div style={{
//                     width: "200px",
//                     minWidth: "200px",
//                     height: "100%",
//                     borderRight: "1px solid var(--secondary)",
//                     backgroundColor: "var(--light)",
//                     display: "flex",
//                     flexDirection: "column",
//                     zIndex: 100
//                 }}>
//                     <div style={{ padding: "14px", borderBottom: "1px solid var(--secondary)", color: "var(--dark-100)", fontSize: "14px", fontWeight: "bold" }}>
//                         Thumbnails
//                     </div>
//                     <div style={{ flex: 1, overflow: "hidden" }}>
//                         <Virtuoso
//                             ref={sidebarVirtuosoRef}
//                             style={{ height: "100%" }}
//                             totalCount={numPages}
//                             overscan={80}
//                             itemContent={(index) => (
//                                 <div
//                                     onClick={() => handleThumbnailClick(index)}
//                                     style={{
//                                         padding: "10px",
//                                         cursor: "pointer",
//                                         display: "flex",
//                                         flexDirection: "column",
//                                         alignItems: "center",
//                                         backgroundColor: currentPage === index ? "var(--dark-06)" : "transparent",
//                                         transition: "background-color 0.2s",
//                                         borderBottom: "1px solid var(--secondary)"
//                                     }}
//                                 >
//                                     <div style={{ width: "100%", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", background: "#fff" }}>
//                                         <PdfPage
//                                             pdf={pdf}
//                                             pageIndex={index}
//                                             scale={0.2}
//                                             isThumb={true}
//                                         />
//                                     </div>
//                                     <span style={{ fontSize: "11px", color: currentPage === index ? "var(--dark-100)" : "var(--dark-50)", marginTop: "6px" }}>
//                                         Page {index + 1}
//                                     </span>
//                                 </div>
//                             )}
//                         />
//                     </div>
//                 </div>
//             )}

//             {/* Main viewer */}
//             <div style={{ flex: 1, height: "100%", backgroundColor: "var(--dark-06)", position: "relative" }}>
//                 <Virtuoso
//                     ref={virtuosoRef}
//                     style={{ height: "100%", width: "100%" }}
//                     totalCount={numPages}
//                     overscan={120}
//                     rangeChanged={({ startIndex }) => setCurrentPage(startIndex)}
//                     itemContent={(index) => (
//                         <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
//                             <div style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background: "#fff" }}>
//                                 <PdfPage
//                                     pdf={pdf}
//                                     pageIndex={index}
//                                     scale={scale}
//                                     isThumb={false}
//                                     isActivePage={index === currentPage}
//                                 />
//                             </div>
//                         </div>
//                     )}
//                 />
//             </div>

//             {/* Controls */}
//             <div className="image-preview-bar" style={{ zIndex: 1001 }}>
//                 <div className="new-preview-zoom-controls-sub">
//                     <button
//                         className="image-preview-btn"
//                         onClick={() => setShowSidebar((prev) => !prev)}
//                         title="Toggle Sidebar"
//                     >
//                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
//                             <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
//                             <line x1="9" y1="3" x2="9" y2="21" />
//                         </svg>
//                     </button>
//                 </div>

//                 <div className="new-preview-zoom-controls-sub after-line-horizontal" style={{ padding: "0 10px", gap: "8px", minWidth: "120px" }}>
//                     <button
//                         className="image-preview-btn"
//                         onClick={zoomOut}
//                         disabled={scale <= 0.5}
//                         style={{ opacity: scale <= 0.5 ? 0.35 : 1 }}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={nagativIcon}
//                             width={24}
//                             alt="Zoom Out"
//                             customStyle={{ cursor: scale <= 0.5 ? "not-allowed" : "pointer" }}
//                         />
//                     </button>
//                     <span className="image-preview-pct" style={{ minWidth: "45px" }}>{Math.round(scale * 100)}%</span>
//                     <button
//                         className="image-preview-btn"
//                         onClick={zoomIn}
//                         disabled={scale >= 3}
//                         style={{ opacity: scale >= 3 ? 0.35 : 1 }}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={plusIcon}
//                             width={24}
//                             alt="Zoom In"
//                             customStyle={{ cursor: scale >= 3 ? "not-allowed" : "pointer" }}
//                         />
//                     </button>
//                 </div>

//                 <div className="new-preview-zoom-controls-sub">
//                     <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
//                         <InteractiveIcon defaultIcon={magnificationIcon} width={24} alt="Reset Zoom" />
//                     </button>
//                 </div>

//                 {numPages > 0 && (
//                     <div className="new-preview-zoom-controls-sub" style={{ padding: "0 10px", fontSize: "12px", fontWeight: "500", minWidth: "60px" }}>
//                         <span>{currentPage + 1} / {numPages}</span>
//                     </div>
//                 )}
//             </div>

//         </div>
//     )
// }

// export default PdfViewer




























// // import { memo, useEffect, useRef, useState, useCallback } from "react"
// // import * as pdfjsLib from "pdfjs-dist"
// // import "pdfjs-dist/web/pdf_viewer.css"

// // import plusIcon from "@images/icon/plus.svg"
// // import nagativIcon from "@images/icon/negativ-icon.svg"
// // import magnificationIcon from "@images/icon/magnification-icon.svg"

// // pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
// //     "pdfjs-dist/build/pdf.worker.min.mjs",
// //     import.meta.url
// // ).toString()

// // const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
// // const CMAP_PACKED = true
// // const THUMB_SCALE = 0.2

// // const PdfPage = memo(function PdfPage({ pdf, pageIndex, scale, isThumb = false, isActivePage = false, cachedSize, onSizeReady }) {
// //     const canvasRef = useRef(null)
// //     const textLayerRef = useRef(null)
// //     const renderTaskRef = useRef(null)
// //     const textLayerTaskRef = useRef(null)
// //     const [pageSize, setPageSize] = useState(cachedSize || { width: 300, height: 400 })
// //     const [loadingPage, setLoadingPage] = useState(true)

// //     useEffect(() => {
// //         if (!pdf) return

// //         let cancelled = false
// //         setLoadingPage(true)

// //         const renderPage = async () => {
// //             try {
// //                 const page = await pdf.getPage(pageIndex + 1)
// //                 if (cancelled) return

// //                 const viewport = page.getViewport({ scale })
// //                 const canvas = canvasRef.current
// //                 if (!canvas) return

// //                 const dpr = window.devicePixelRatio || 1
// //                 canvas.width = viewport.width * dpr
// //                 canvas.height = viewport.height * dpr
// //                 canvas.style.width = `${viewport.width}px`
// //                 canvas.style.height = `${viewport.height}px`

// //                 const newSize = { width: viewport.width, height: viewport.height }
// //                 setPageSize(newSize)
// //                 onSizeReady?.(pageIndex, newSize, isThumb)

// //                 const context = canvas.getContext("2d", { alpha: false })
// //                 context.scale(dpr, dpr)

// //                 if (renderTaskRef.current) renderTaskRef.current.cancel()

// //                 const renderTask = page.render({ canvasContext: context, viewport })
// //                 renderTaskRef.current = renderTask
// //                 await renderTask.promise
// //                 if (cancelled) return

// //                 setLoadingPage(false)

// //                 if (!isThumb && isActivePage && textLayerRef.current) {
// //                     const renderTextLayer = async () => {
// //                         if (cancelled || !textLayerRef.current) return
// //                         textLayerRef.current.innerHTML = ""
// //                         textLayerRef.current.style.width = `${viewport.width}px`
// //                         textLayerRef.current.style.height = `${viewport.height}px`

// //                         const textContent = await page.getTextContent()
// //                         if (cancelled || !textLayerRef.current) return

// //                         const textLayer = new pdfjsLib.TextLayer({
// //                             textContentSource: textContent,
// //                             container: textLayerRef.current,
// //                             viewport,
// //                         })
// //                         textLayerTaskRef.current = textLayer
// //                         await textLayer.render()
// //                     }

// //                     requestAnimationFrame(() => {
// //                         renderTextLayer().catch((err) => {
// //                             if (err?.name !== "RenderingCancelledException") {
// //                                 console.error(`Page ${pageIndex + 1} text layer error:`, err)
// //                             }
// //                         })
// //                     })
// //                 }
// //             } catch (err) {
// //                 if (err?.name !== "RenderingCancelledException") {
// //                     console.error(`Page ${pageIndex + 1} render error:`, err)
// //                 }
// //                 if (!cancelled) setLoadingPage(false)
// //             }
// //         }

// //         renderPage()

// //         return () => {
// //             cancelled = true
// //             if (renderTaskRef.current) renderTaskRef.current.cancel()
// //             if (textLayerRef.current) textLayerRef.current.innerHTML = ""
// //         }
// //     }, [pdf, pageIndex, scale, isThumb, isActivePage])

// //     if (isThumb) {
// //         return (
// //             <div
// //                 className="pdf-preview__thumb-canvas-wrap"
// //                 style={{ height: `${pageSize.height}px` }}
// //             >
// //                 {loadingPage && (
// //                     <div className="pdf-preview__thumb-spinner">
// //                         <div className="spinner-border text-primary" role="status" style={{ width: "1.2rem", height: "1.2rem" }} />
// //                     </div>
// //                 )}
// //                 <canvas ref={canvasRef} className="pdf-preview__thumb-canvas" />
// //             </div>
// //         )
// //     }

// //     return (
// //         <div
// //             className="pdf-preview__page"
// //             style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
// //         >
// //             {loadingPage && (
// //                 <div className="pdf-preview__page-spinner">
// //                     <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }} />
// //                 </div>
// //             )}
// //             <canvas ref={canvasRef} className="pdf-preview__page-canvas" />
// //             {isActivePage && (
// //                 <div
// //                     ref={textLayerRef}
// //                     className="textLayer pdf-preview__text-layer"
// //                 />
// //             )}
// //         </div>
// //     )
// // })

// // function PdfViewer({ file: fileData }) {
// //     const [pdf, setPdf] = useState(null)
// //     const [numPages, setNumPages] = useState(0)
// //     const [scale, setScale] = useState(1)
// //     const [currentPage, setCurrentPage] = useState(0)
// //     const [showSidebar, setShowSidebar] = useState(false)
// //     const [loading, setLoading] = useState(true)
// //     const [error, setError] = useState(false)

// //     const [pageInput, setPageInput] = useState("")
// //     const [pageInputFocused, setPageInputFocused] = useState(false)

// //     const mainPageSizeCache = useRef({})
// //     const thumbPageSizeCache = useRef({})

// //     const mainScrollRef = useRef(null)
// //     const sidebarScrollRef = useRef(null)
// //     const pageRefs = useRef([])
// //     const thumbRefs = useRef([])

// //     const isProgrammatic = useRef(false)
// //     const programmaticTimer = useRef(null)
// //     const currentPageRef = useRef(0)

// //     useEffect(() => {
// //         currentPageRef.current = currentPage
// //     }, [currentPage])

// //     // ── Load PDF ──
// //     useEffect(() => {
// //         if (!fileData) return

// //         setLoading(true)
// //         setError(false)
// //         setPdf(null)
// //         setNumPages(0)
// //         setCurrentPage(0)
// //         currentPageRef.current = 0
// //         mainPageSizeCache.current = {}
// //         thumbPageSizeCache.current = {}
// //         pageRefs.current = []
// //         thumbRefs.current = []

// //         let loadingTask = null

// //         const load = async () => {
// //             try {
// //                 let source = {}
// //                 if (fileData instanceof ArrayBuffer) {
// //                     source = { data: fileData }
// //                 } else if (fileData instanceof Blob || fileData instanceof File) {
// //                     const buffer = await fileData.arrayBuffer()
// //                     source = { data: buffer }
// //                 } else if (typeof fileData === "string") {
// //                     source = { url: fileData }
// //                 } else if (typeof fileData === "object" && fileData.url) {
// //                     source = { url: fileData.url }
// //                 } else if (typeof fileData === "object" && fileData.data) {
// //                     source = { data: fileData.data }
// //                 } else {
// //                     source = { data: fileData }
// //                 }

// //                 loadingTask = pdfjsLib.getDocument({ ...source, cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED })
// //                 const pdfDoc = await loadingTask.promise
// //                 setPdf(pdfDoc)
// //                 setNumPages(pdfDoc.numPages)
// //                 setLoading(false)
// //             } catch (err) {
// //                 console.error("PDF load error:", err)
// //                 setError(true)
// //                 setLoading(false)
// //             }
// //         }

// //         load()
// //         return () => { if (loadingTask) loadingTask.destroy() }
// //     }, [fileData])

// //     // ── KEY FIX: Observer — scroll-based tracking only, programmatic scroll ma off ──
// //     useEffect(() => {
// //         if (!numPages || !mainScrollRef.current) return

// //         const scrollEl = mainScrollRef.current

// //         const observer = new IntersectionObserver(
// //             (entries) => {
// //                 // Programmatic scroll chal raha ho tab bilkul ignore karo
// //                 if (isProgrammatic.current) return

// //                 // Viewport na top half ma joi ne page track karo
// //                 // rootMargin: top 0, bottom -50% matlab sirf upar wala half count karo
// //                 let topMost = Infinity
// //                 let topIndex = -1

// //                 entries.forEach((entry) => {
// //                     if (entry.isIntersecting) {
// //                         const idx = Number(entry.target.dataset.pageIndex)
// //                         if (idx < topMost) {
// //                             topMost = idx
// //                             topIndex = idx
// //                         }
// //                     }
// //                 })

// //                 if (topIndex >= 0 && topIndex !== currentPageRef.current) {
// //                     currentPageRef.current = topIndex
// //                     setCurrentPage(topIndex)
// //                 }
// //             },
// //             {
// //                 root: scrollEl,
// //                 // KEY: bottom -60% — matlab page nu upar walo 40% visible thay tabhi count thase
// //                 // Athi previous page visible rehvanu band thase jyare next page upar aave
// //                 rootMargin: "0px 0px -60% 0px",
// //                 threshold: 0,
// //             }
// //         )

// //         pageRefs.current.forEach((el) => {
// //             if (el) observer.observe(el)
// //         })

// //         return () => observer.disconnect()
// //     }, [numPages, pdf])

// //     // ── Sidebar thumb auto-scroll — only natural scroll par ──
// //     useEffect(() => {
// //         if (isProgrammatic.current) return
// //         const thumbEl = thumbRefs.current[currentPage]
// //         if (thumbEl && sidebarScrollRef.current) {
// //             thumbEl.scrollIntoView({ behavior: "smooth", block: "nearest" })
// //         }
// //     }, [currentPage])

// //     useEffect(() => {
// //         if (!pageInputFocused) setPageInput(String(currentPage + 1))
// //     }, [currentPage, pageInputFocused])

// //     const handleSizeReady = useCallback((index, size, isThumb) => {
// //         if (isThumb) thumbPageSizeCache.current[index] = size
// //         else mainPageSizeCache.current[index] = size
// //     }, [])

// //     const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)
// //     const zoomIn = () => setScale((prev) => clampScale(Math.round((prev + 0.2) * 10) / 10))
// //     const zoomOut = () => setScale((prev) => clampScale(Math.round((prev - 0.2) * 10) / 10))
// //     const resetZoom = () => setScale(1)

// //     // ── KEY FIX: scrollToPage — instant state set + long guard ──
// //     const scrollToPage = useCallback((index) => {
// //         if (index < 0 || index >= numPages) return

// //         // 1. Guard on karo
// //         isProgrammatic.current = true
// //         clearTimeout(programmaticTimer.current)

// //         // 2. State turant set karo — ahi j sahi page active thase
// //         currentPageRef.current = index
// //         setCurrentPage(index)

// //         // 3. Main scroll
// //         const pageEl = pageRefs.current[index]
// //         if (pageEl && mainScrollRef.current) {
// //             pageEl.scrollIntoView({ behavior: "smooth", block: "start" })
// //         }

// //         // 4. Sidebar scroll
// //         const thumbEl = thumbRefs.current[index]
// //         if (thumbEl && sidebarScrollRef.current) {
// //             thumbEl.scrollIntoView({ behavior: "smooth", block: "nearest" })
// //         }

// //         // 5. Scroll finish thay pacchi guard off — 1200ms safe margin
// //         programmaticTimer.current = setTimeout(() => {
// //             isProgrammatic.current = false
// //         }, 1200)
// //     }, [numPages])

// //     const handleThumbnailClick = useCallback((index) => {
// //         scrollToPage(index)
// //     }, [scrollToPage])

// //     const goToPage = useCallback((pageNum) => {
// //         scrollToPage(pageNum - 1)
// //     }, [scrollToPage])

// //     const handlePageInputChange = (e) => setPageInput(e.target.value)

// //     const handlePageInputKeyDown = (e) => {
// //         if (e.key === "Enter") {
// //             const page = parseInt(pageInput, 10)
// //             if (!isNaN(page)) goToPage(page)
// //             else setPageInput(String(currentPage + 1))
// //             e.target.blur()
// //         }
// //         if (e.key === "Escape") {
// //             setPageInput(String(currentPage + 1))
// //             e.target.blur()
// //         }
// //         if (e.key === "ArrowUp") {
// //             e.preventDefault()
// //             goToPage(currentPage + 2)
// //         }
// //         if (e.key === "ArrowDown") {
// //             e.preventDefault()
// //             goToPage(currentPage)
// //         }
// //     }

// //     const handlePageInputBlur = () => {
// //         setPageInputFocused(false)
// //         const page = parseInt(pageInput, 10)
// //         if (!isNaN(page) && page >= 1 && page <= numPages) goToPage(page)
// //         else setPageInput(String(currentPage + 1))
// //     }

// //     if (loading) {
// //         return (
// //             <div className="pdf-preview__loading">
// //                 <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
// //                 <span className="pdf-preview__loading-text">Loading Document...</span>
// //             </div>
// //         )
// //     }

// //     if (error) {
// //         return (
// //             <div className="pdf-preview__error">
// //                 <span>Failed to load PDF</span>
// //             </div>
// //         )
// //     }

// //     const pages = Array.from({ length: numPages }, (_, i) => i)

// //     return (
// //         <div className="pdf-preview">

// //             {numPages > 0 && showSidebar && (
// //                 <div className="pdf-preview__sidebar">
// //                     <div
// //                         ref={sidebarScrollRef}
// //                         className="pdf-preview__sidebar-scroll"
// //                         style={{ height: "100%", overflowY: "auto" }}
// //                     >
// //                         {pages.map((index) => (
// //                             <div
// //                                 key={index}
// //                                 ref={(el) => { thumbRefs.current[index] = el }}
// //                                 onClick={() => handleThumbnailClick(index)}
// //                                 className={`pdf-preview__thumb-item${currentPage === index ? " pdf-preview__thumb-item--active" : ""}`}
// //                             >
// //                                 <div className="pdf-preview__thumb-box">
// //                                     <PdfPage
// //                                         pdf={pdf}
// //                                         pageIndex={index}
// //                                         scale={THUMB_SCALE}
// //                                         isThumb={true}
// //                                         cachedSize={thumbPageSizeCache.current[index] || undefined}
// //                                         onSizeReady={handleSizeReady}
// //                                     />
// //                                 </div>
// //                                 <span className={`pdf-preview__thumb-label${currentPage === index ? " pdf-preview__thumb-label--active" : ""}`}>
// //                                     Page {index + 1}
// //                                 </span>
// //                             </div>
// //                         ))}
// //                     </div>
// //                 </div>
// //             )}

// //             <div className="pdf-preview__main">
// //                 <div
// //                     ref={mainScrollRef}
// //                     style={{ height: "100%", width: "100%", overflowY: "auto" }}
// //                 >
// //                     {pages.map((index) => (
// //                         <div
// //                             key={index}
// //                             ref={(el) => { pageRefs.current[index] = el }}
// //                             data-page-index={index}
// //                             className="pdf-preview__page-wrap"
// //                         >
// //                             <div className="pdf-preview__page-shadow">
// //                                 <PdfPage
// //                                     pdf={pdf}
// //                                     pageIndex={index}
// //                                     scale={scale}
// //                                     isThumb={false}
// //                                     isActivePage={index === currentPage}
// //                                     cachedSize={mainPageSizeCache.current[index]}
// //                                     onSizeReady={handleSizeReady}
// //                                 />
// //                             </div>
// //                         </div>
// //                     ))}
// //                 </div>
// //             </div>

// //             <div className="image-preview-bar" style={{ zIndex: 1001 }}>
// //                 <div className="new-preview-zoom-controls-sub">
// //                     <button
// //                         className="image-preview-btn"
// //                         onClick={() => setShowSidebar((prev) => !prev)}
// //                         title="Toggle Sidebar"
// //                     >
// //                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showSidebar ? "pdf-preview__sidebar-icon--active" : "pdf-preview__sidebar-icon"}>
// //                             <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
// //                             <line x1="9" y1="3" x2="9" y2="21" />
// //                         </svg>
// //                     </button>
// //                 </div>

// //                 {numPages > 0 && (
// //                     <div className="new-preview-zoom-controls-sub after-line-horizontal pdf-preview__page-input-wrap">
// //                         <input
// //                             className="pdf-preview__page-input"
// //                             type="number"
// //                             min={1}
// //                             max={numPages}
// //                             value={pageInput}
// //                             onChange={handlePageInputChange}
// //                             onFocus={() => { setPageInputFocused(true); setPageInput("") }}
// //                             onBlur={handlePageInputBlur}
// //                             onKeyDown={handlePageInputKeyDown}
// //                         />
// //                         <span className="pdf-preview__page-total">/ {numPages}</span>
// //                     </div>
// //                 )}

// //                 <div className="new-preview-zoom-controls-sub after-line-horizontal" style={{ padding: "0 10px", gap: "8px", minWidth: "120px" }}>
// //                     <button className="image-preview-btn" onClick={zoomOut} disabled={scale <= 0.5} style={{ opacity: scale <= 0.5 ? 0.35 : 1 }}>
// //                         <img src={nagativIcon} alt="-" />
// //                     </button>
// //                     <span className="image-preview-pct" style={{ minWidth: "45px" }}>{Math.round(scale * 100)}%</span>
// //                     <button className="image-preview-btn" onClick={zoomIn} disabled={scale >= 3} style={{ opacity: scale >= 3 ? 0.35 : 1 }}>
// //                         <img src={plusIcon} alt="+" />
// //                     </button>
// //                 </div>

// //                 <div className="new-preview-zoom-controls-sub">
// //                     <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
// //                         <img src={magnificationIcon} alt="reset" />
// //                     </button>
// //                 </div>

// //                 {numPages > 0 && (
// //                     <div className="new-preview-zoom-controls-sub" style={{ padding: "0 10px", fontSize: "12px", fontWeight: "500", minWidth: "60px" }}>
// //                         <span>{currentPage + 1} / {numPages}</span>
// //                     </div>
// //                 )}
// //             </div>

// //         </div>
// //     )
// // }

// // export default PdfViewer





























import { memo, useEffect, useRef, useState, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import * as pdfjsLib from "pdfjs-dist"
import { Form } from 'react-bootstrap';
import fileIcon from "@images/svgs/file.svg"
import "pdfjs-dist/web/pdf_viewer.css"



pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString()

const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
const CMAP_PACKED = true

const PageSkeleton = ({ width, height }) => (
    <div
        className="pdf-preview__skeleton"
        style={{ width: `${width}px`, height: `${height}px` }}
    />
)

const PdfPage = memo(function PdfPage({
    pdf,
    pageIndex,
    scale,
    isThumb = false,
    isActivePage = false,
    cachedSize,
    onSizeReady,
}) {
    const canvasRef = useRef(null)
    const textLayerRef = useRef(null)
    const renderTaskRef = useRef(null)
    const textLayerTaskRef = useRef(null)

    const getInitialSize = () => {
        if (cachedSize) return cachedSize
        return { width: isThumb ? 120 : 600, height: isThumb ? 160 : 800 }
    }

    const [pageSize, setPageSize] = useState(getInitialSize)
    const [rendered, setRendered] = useState(false)
    const [forceRender, setForceRender] = useState(0)

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                setForceRender(prev => prev + 1)
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    useEffect(() => {
        if (!pdf) return

        let cancelled = false
        setRendered(false)

        const renderPage = async () => {
            try {
                const page = await pdf.getPage(pageIndex + 1)
                if (cancelled) return

                const dpr = window.devicePixelRatio || 1
                const viewport = page.getViewport({ scale })

                const canvas = canvasRef.current
                if (!canvas) return

                canvas.width = viewport.width * dpr
                canvas.height = viewport.height * dpr
                canvas.style.width = `${viewport.width}px`
                canvas.style.height = `${viewport.height}px`

                const newSize = { width: viewport.width, height: viewport.height }
                setPageSize(newSize)
                onSizeReady?.(pageIndex, newSize)

                const context = canvas.getContext("2d", { alpha: false })
                context.scale(dpr, dpr)

                renderTaskRef.current?.cancel()

                const renderTask = page.render({ canvasContext: context, viewport })
                renderTaskRef.current = renderTask
                await renderTask.promise
                if (cancelled) return

                setRendered(true)

                if (!isThumb && textLayerRef.current) {
                    requestAnimationFrame(async () => {
                        if (cancelled || !textLayerRef.current) return
                        try {
                            textLayerRef.current.innerHTML = ""
                            textLayerRef.current.style.width = `${viewport.width}px`
                            textLayerRef.current.style.height = `${viewport.height}px`
                            textLayerRef.current.style.overflow = "hidden"
                            textLayerRef.current.style.setProperty("--scale-factor", scale)

                            const textContent = await page.getTextContent()
                            if (cancelled || !textLayerRef.current) return

                            const textViewport = page.getViewport({ scale })

                            const textLayer = new pdfjsLib.TextLayer({
                                textContentSource: textContent,
                                container: textLayerRef.current,
                                viewport: textViewport,
                            })
                            textLayerTaskRef.current = textLayer
                            await textLayer.render()
                        } catch (err) {
                            if (err?.name !== "RenderingCancelledException") {
                                console.error(`Page ${pageIndex + 1} text layer error:`, err)
                            }
                        }
                    })
                }
            } catch (err) {
                if (err?.name !== "RenderingCancelledException") {
                    console.error(`Page ${pageIndex + 1} render error:`, err)
                }
                if (!cancelled) setRendered(true)
            }
        }

        renderPage()

        return () => {
            cancelled = true
            renderTaskRef.current?.cancel()
            if (textLayerRef.current) textLayerRef.current.innerHTML = ""
        }
    }, [pdf, pageIndex, scale, isThumb, forceRender])

    if (isThumb) {
        return (
            <div
                className="pdf-preview__thumb-canvas-wrap"
                style={{ height: `${pageSize.height}px` }}
            >
                {!rendered && (
                    <div className="pdf-preview__skeleton-wrap">
                        <PageSkeleton width={pageSize.width} height={pageSize.height} />
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className={`pdf-preview__thumb-canvas${rendered ? " pdf-preview__canvas--rendered" : ""}`}
                />
            </div>
        )
    }

    return (
        <div
            className="pdf-preview__page"
            style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px`, position: "relative" }}
        >
            {!rendered && (
                <div className="pdf-preview__skeleton-wrap">
                    <PageSkeleton width={pageSize.width} height={pageSize.height} />
                </div>
            )}
            <canvas
                ref={canvasRef}
                className={`pdf-preview__page-canvas${rendered ? " pdf-preview__canvas--rendered" : ""}`}
            />
            {!isThumb && (
                <div
                    ref={textLayerRef}
                    className="textLayer pdf-preview__text-layer"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        pointerEvents: "auto",
                        overflow: "hidden",
                        userSelect: "text",
                        WebkitUserSelect: "text",
                        zIndex: 10,
                        opacity: 1
                    }}
                />
            )}
        </div>
    )
})

const LoadingScreen = () => (
    <div className="pdf-preview__loading">
        <div className='file-upload-loader-container'>
            <div className='file-upload-loader'></div>
        </div>
    </div>
)

function PdfViewer({ file: fileData }) {
    const [pdf, setPdf] = useState(null)
    const [numPages, setNumPages] = useState(0)
    const [scale, setScale] = useState(1)
    const [currentPage, setCurrentPage] = useState(0)
    const [showSidebar, setShowSidebar] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [fileSizeMB, setFileSizeMB] = useState(null)

    const [pageInput, setPageInput] = useState("")
    const [pageInputFocused, setPageInputFocused] = useState(false)

    const pageSizeCache = useRef({})
    const virtuosoRef = useRef(null)
    const sidebarVirtuosoRef = useRef(null)
    const isScrollingProgrammatically = useRef(false)

    useEffect(() => {
        if (!fileData) return

        setLoading(true)
        setError(false)
        setPdf(null)
        setNumPages(0)
        setCurrentPage(0)
        setFileSizeMB(null)
        pageSizeCache.current = {}

        let loadingTask = null

        const load = async () => {
            try {
                let source = {}

                if (fileData instanceof File || fileData instanceof Blob) {
                    setFileSizeMB((fileData.size / (1024 * 1024)).toFixed(1))
                }

                if (fileData instanceof ArrayBuffer) {
                    source = { data: fileData }
                } else if (fileData instanceof Blob || fileData instanceof File) {
                    source = { data: await fileData.arrayBuffer() }
                } else if (typeof fileData === "string") {
                    source = { url: fileData }
                } else if (typeof fileData === "object" && fileData.url) {
                    source = { url: fileData.url }
                } else if (typeof fileData === "object" && fileData.storagePath) {
                    source = { url: `/files${fileData.storagePath}`, withCredentials: true }
                } else if (typeof fileData === "object" && fileData.data) {
                    source = { data: fileData.data }
                } else {
                    source = { data: fileData }
                }

                loadingTask = pdfjsLib.getDocument({
                    ...source,
                    cMapUrl: CMAP_URL,
                    cMapPacked: CMAP_PACKED,
                })

                const pdfDoc = await loadingTask.promise
                setPdf(pdfDoc)
                setNumPages(pdfDoc.numPages)
                setLoading(false)
            } catch (err) {
                console.error("PDF load error:", err)
                setError(true)
                setLoading(false)
            }
        }

        load()

        return () => { loadingTask?.destroy() }
    }, [fileData])

    useEffect(() => {
        if (!pageInputFocused) setPageInput(String(currentPage + 1))
    }, [currentPage, pageInputFocused])

    const handleSizeReady = useCallback((index, size) => {
        pageSizeCache.current[index] = size
    }, [])

    const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)
    const zoomIn = () => setScale((p) => clampScale(Math.round((p + 0.2) * 10) / 10))
    const zoomOut = () => setScale((p) => clampScale(Math.round((p - 0.2) * 10) / 10))
    const resetZoom = () => setScale(1)

    const handleDownload = useCallback(() => {
        if (!fileData) return
        const url = fileData instanceof File || fileData instanceof Blob
            ? URL.createObjectURL(fileData)
            : typeof fileData === "string" ? fileData : fileData?.url
        if (!url) return
        const a = document.createElement("a")
        a.href = url
        a.download = fileData?.name || "document.pdf"
        a.click()
        if (fileData instanceof File || fileData instanceof Blob) URL.revokeObjectURL(url)
    }, [fileData])

    const programmaticScroll = useCallback((index) => {
        isScrollingProgrammatically.current = true
        setCurrentPage(index)
        virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" })
        setTimeout(() => { isScrollingProgrammatically.current = false }, 600)
    }, [])

    const handleThumbnailClick = useCallback((index) => {
        programmaticScroll(index)
        sidebarVirtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" })
    }, [programmaticScroll])

    const goToPage = useCallback((pageNum) => {
        const index = pageNum - 1
        if (index >= 0 && index < numPages) {
            programmaticScroll(index)
            sidebarVirtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" })
        }
    }, [numPages, programmaticScroll])

    const handlePageInputChange = (e) => setPageInput(e.target.value)

    const handlePageInputKeyDown = (e) => {
        if (e.key === "Enter") {
            const page = parseInt(pageInput, 10)
            if (!isNaN(page)) goToPage(page)
            else setPageInput(String(currentPage + 1))
            e.target.blur()
        }
        if (e.key === "Escape") {
            setPageInput(String(currentPage + 1))
            e.target.blur()
        }
        if (e.key === "ArrowUp") { e.preventDefault(); goToPage(currentPage + 2) }
        if (e.key === "ArrowDown") { e.preventDefault(); goToPage(currentPage) }
    }

    const handlePageInputBlur = () => {
        setPageInputFocused(false)
        const page = parseInt(pageInput, 10)
        if (!isNaN(page) && page >= 1 && page <= numPages) goToPage(page)
        else setPageInput(String(currentPage + 1))
    }

    const handlePageSelectorSubmit = () => {
        const page = parseInt(pageInput, 10)
        if (!isNaN(page)) goToPage(page)
    }

    if (loading) return <LoadingScreen />

    if (error) {
        return (
            <div className="preview-toobig">
                <div className="txt-toobig-icon">
                    <img src={fileIcon} alt="" width={38} />
                </div>
                <p className="preview-toobig-title m-0">File too large to preview</p>
                <p className="mute-text">
                    {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
                    Files larger than 50 MB cannot be previewed.
                </p>
                <button className="btn-primary btn mt-2" onClick={handleDownload}>
                    Download
                </button>
            </div>
        )
    }

    return (
        <div className="pdf-preview">

            {numPages > 0 && showSidebar && (
                <div className="pdf-preview__sidebar">
                    <div className="pdf-preview__sidebar-scroll">
                        <Virtuoso
                            ref={sidebarVirtuosoRef}
                            style={{ height: "100%" }}
                            totalCount={numPages}
                            overscan={80}
                            defaultItemHeight={200}
                            itemContent={(index) => (
                                <div
                                    onClick={() => handleThumbnailClick(index)}
                                    className={`pdf-preview__thumb-item${currentPage === index ? " pdf-preview__thumb-item--active" : ""}`}
                                >
                                    <div className="pdf-preview__thumb-box">
                                        <PdfPage
                                            pdf={pdf}
                                            pageIndex={index}
                                            scale={0.2}
                                            isThumb={true}
                                            cachedSize={
                                                pageSizeCache.current[index]
                                                    ? {
                                                        width: pageSizeCache.current[index].width * 0.2,
                                                        height: pageSizeCache.current[index].height * 0.2,
                                                    }
                                                    : undefined
                                            }
                                            onSizeReady={handleSizeReady}
                                        />
                                    </div>
                                    <span className={`pdf-preview__thumb-label${currentPage === index ? " pdf-preview__thumb-label--active" : ""}`}>
                                        Page {index + 1}
                                    </span>
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}

            <div className="pdf-preview__main">
                <Virtuoso
                    ref={virtuosoRef}
                    style={{ height: "100%", width: "100%" }}
                    totalCount={numPages}
                    overscan={120}
                    defaultItemHeight={860}
                    rangeChanged={({ startIndex }) => {
                        if (!isScrollingProgrammatically.current) {
                            setCurrentPage(startIndex)
                        }
                    }}
                    itemContent={(index) => (
                        <div className="pdf-preview__page-wrap">
                            <div className="pdf-preview__page-shadow">
                                <PdfPage
                                    pdf={pdf}
                                    pageIndex={index}
                                    scale={scale}
                                    isThumb={false}
                                    isActivePage={index === currentPage}
                                    cachedSize={pageSizeCache.current[index]}
                                    onSizeReady={handleSizeReady}
                                />
                            </div>
                        </div>
                    )}
                />
            </div>

            <div className="image-preview-bar">

                <div className="new-preview-zoom-controls-sub">
                    <button className="image-preview-btn" onClick={() => setShowSidebar((prev) => !prev)} title="Toggle Sidebar">
                    </button>
                </div>

                {numPages > 0 && (
                    <div className="new-preview-pagination-pdf-single-box">
                        <div className="d-flex align-items-center new-preview-pagination-pdf-page">
                            <span className="pdf-page-count me-1">{currentPage + 1}</span>
                            <span className="pdf-page-of me-1">of</span>
                            <span className="pdf-page-total me-1">{numPages}</span>
                        </div>

                        <div className="new-preview-pagination">
                            <div className="position-relative d-flex align-items-center">
                                <Form.Group className='m-0 form-group'>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={numPages}
                                        value={pageInput}
                                        onChange={handlePageInputChange}
                                        onFocus={() => { setPageInputFocused(true); setPageInput("") }}
                                        onBlur={handlePageInputBlur}
                                        onKeyDown={handlePageInputKeyDown}
                                    />
                                </Form.Group>
                                <button className="pageSelectorSubmit" onClick={handlePageSelectorSubmit}>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="new-preview-zoom-controls-sub after-line-horizontal">
                    <button
                        className={`image-preview-btn ${scale <= 0.5 ? " pdf-preview__btn--disabled" : ""}`}
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                    >
                    </button>
                    <button
                        className={`image-preview-btn${scale >= 3 ? " pdf-preview__btn--disabled" : ""}`}
                        onClick={zoomIn}
                        disabled={scale >= 3}
                    >
                    </button>
                </div>

                <div className="new-preview-zoom-controls-sub">
                    <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">

                    </button>
                </div>

            </div>
        </div>
    )
}

export default PdfViewer