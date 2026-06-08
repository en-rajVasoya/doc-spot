import { memo, useEffect, useRef, useState, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import * as pdfjsLib from "pdfjs-dist"
import "pdfjs-dist/web/pdf_viewer.css"
import InteractiveIcon from "../../layout/InteractiveIcon"
import plusIcon from "@images/icon/plus.svg"
import nagativIcon from "@images/icon/negativ-icon.svg"
import magnificationIcon from "@images/icon/magnification-icon.svg"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString()

const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
const CMAP_PACKED = true

const PdfPage = memo(function PdfPage({ pdf, pageIndex, scale, isThumb = false, isActivePage = false }) {
    const canvasRef = useRef(null)
    const textLayerRef = useRef(null)
    const renderTaskRef = useRef(null)
    const textLayerTaskRef = useRef(null)
    const [pageSize, setPageSize] = useState({ width: 300, height: 400 })
    const [loadingPage, setLoadingPage] = useState(true)

    useEffect(() => {
        if (!pdf) return

        let cancelled = false
        setLoadingPage(true)

        const renderPage = async () => {
            try {
                const page = await pdf.getPage(pageIndex + 1)
                if (cancelled) return

                const viewport = page.getViewport({ scale })
                setPageSize({ width: viewport.width, height: viewport.height })

                const canvas = canvasRef.current
                if (!canvas) return

                const context = canvas.getContext("2d", { alpha: false })
                canvas.width = viewport.width
                canvas.height = viewport.height

                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel()
                }

                const renderTask = page.render({
                    canvasContext: context,
                    viewport,
                })
                renderTaskRef.current = renderTask
                await renderTask.promise
                if (cancelled) return

                setLoadingPage(false)

                // Text layer is expensive — only for the active main page, after canvas paint
                if (!isThumb && isActivePage && textLayerRef.current) {
                    const renderTextLayer = async () => {
                        if (cancelled || !textLayerRef.current) return

                        textLayerRef.current.innerHTML = ""
                        textLayerRef.current.style.width = `${viewport.width}px`
                        textLayerRef.current.style.height = `${viewport.height}px`

                        const textContent = await page.getTextContent()
                        if (cancelled || !textLayerRef.current) return

                        const textLayer = new pdfjsLib.TextLayer({
                            textContentSource: textContent,
                            container: textLayerRef.current,
                            viewport,
                        })
                        textLayerTaskRef.current = textLayer
                        await textLayer.render()
                    }

                    requestAnimationFrame(() => {
                        renderTextLayer().catch((err) => {
                            if (err?.name !== "RenderingCancelledException") {
                                console.error(`Page ${pageIndex + 1} text layer error:`, err)
                            }
                        })
                    })
                }
            } catch (err) {
                if (err?.name !== "RenderingCancelledException") {
                    console.error(`Page ${pageIndex + 1} render error:`, err)
                }
                if (!cancelled) setLoadingPage(false)
            }
        }

        renderPage()

        return () => {
            cancelled = true
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel()
            }
            if (textLayerRef.current) {
                textLayerRef.current.innerHTML = ""
            }
        }
    }, [pdf, pageIndex, scale, isThumb, isActivePage])

    if (isThumb) {
        return (
            <div style={{
                position: "relative",
                width: "100%",
                height: `${pageSize.height}px`,
                backgroundColor: "var(--dark-03)",
                borderRadius: "4px",
                overflow: "hidden"
            }}>
                {loadingPage && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.5)"
                    }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: "1.2rem", height: "1.2rem" }} />
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    style={{ display: "block", width: "100%", height: "auto" }}
                />
            </div>
        )
    }

    return (
        <div style={{
            position: "relative",
            display: "inline-block",
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            backgroundColor: "#fff"
        }}>
            {loadingPage && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    zIndex: 2,
                    pointerEvents: "none"
                }}>
                    <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }} />
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: "block" }} />
            {isActivePage && (
                <div
                    ref={textLayerRef}
                    className="textLayer"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        pointerEvents: "auto",
                        userSelect: "text",
                        lineHeight: 1,
                        overflow: "hidden",
                        zIndex: 1
                    }}
                />
            )}
        </div>
    )
})

function PdfViewer({ file: fileData }) {
    const BASE_URL = import.meta.env.VITE_API_URL
    const fileUrl = `${BASE_URL}/download/preview/${fileData._id}`

    const [pdf, setPdf] = useState(null)
    const [numPages, setNumPages] = useState(0)
    const [scale, setScale] = useState(1)
    const [currentPage, setCurrentPage] = useState(0)
    const [showSidebar, setShowSidebar] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState(0)
    const [error, setError] = useState(false)

    const virtuosoRef = useRef(null)
    const sidebarVirtuosoRef = useRef(null)

    useEffect(() => {
        setLoading(true)
        setError(false)
        setPdf(null)
        setNumPages(0)
        setLoadProgress(0)

        const loadingTask = pdfjsLib.getDocument({
            url: fileUrl,
            withCredentials: true,
            cMapUrl: CMAP_URL,
            cMapPacked: CMAP_PACKED,
            // Backend supports Range requests — stream PDF instead of downloading whole file first
            disableRange: false,
            disableStream: false,
            rangeChunkSize: 65536,
        })

        loadingTask.onProgress = ({ loaded, total }) => {
            if (total > 0) {
                setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)))
            }
        }

        loadingTask.promise
            .then((pdfDoc) => {
                setPdf(pdfDoc)
                setNumPages(pdfDoc.numPages)
                setLoadProgress(100)
                setLoading(false)
            })
            .catch((err) => {
                console.error("PDF load error:", err)
                setError(true)
                setLoading(false)
            })

        return () => {
            loadingTask.destroy()
        }
    }, [fileUrl])

    const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)

    const zoomIn = () => setScale((prev) => clampScale(Math.round((prev + 0.2) * 10) / 10))
    const zoomOut = () => setScale((prev) => clampScale(Math.round((prev - 0.2) * 10) / 10))
    const resetZoom = () => setScale(1)

    const handleThumbnailClick = useCallback((index) => {
        setCurrentPage(index)
        virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" })
    }, [])

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "var(--dark-100)" }}>
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
                <span style={{ fontWeight: "500" }}>Loading Document...</span>
                {loadProgress > 0 && (
                    <span style={{ fontSize: "13px", marginTop: "8px", opacity: 0.7 }}>
                        {loadProgress}%
                    </span>
                )}
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "var(--red)" }}>
                <span>Failed to load PDF</span>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%", position: "relative", overflow: "hidden", paddingTop: "60px" }}>

            {/* Sidebar — only mount when open so thumbnails are not rendered in background */}
            {numPages > 0 && showSidebar && (
                <div style={{
                    width: "200px",
                    minWidth: "200px",
                    height: "100%",
                    borderRight: "1px solid var(--secondary)",
                    backgroundColor: "var(--light)",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 100
                }}>
                    <div style={{ padding: "14px", borderBottom: "1px solid var(--secondary)", color: "var(--dark-100)", fontSize: "14px", fontWeight: "bold" }}>
                        Thumbnails
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                        <Virtuoso
                            ref={sidebarVirtuosoRef}
                            style={{ height: "100%" }}
                            totalCount={numPages}
                            overscan={80}
                            itemContent={(index) => (
                                <div
                                    onClick={() => handleThumbnailClick(index)}
                                    style={{
                                        padding: "10px",
                                        cursor: "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        backgroundColor: currentPage === index ? "var(--dark-06)" : "transparent",
                                        transition: "background-color 0.2s",
                                        borderBottom: "1px solid var(--secondary)"
                                    }}
                                >
                                    <div style={{ width: "100%", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", background: "#fff" }}>
                                        <PdfPage
                                            pdf={pdf}
                                            pageIndex={index}
                                            scale={0.2}
                                            isThumb={true}
                                        />
                                    </div>
                                    <span style={{ fontSize: "11px", color: currentPage === index ? "var(--dark-100)" : "var(--dark-50)", marginTop: "6px" }}>
                                        Page {index + 1}
                                    </span>
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}

            {/* Main viewer */}
            <div style={{ flex: 1, height: "100%", backgroundColor: "var(--dark-06)", position: "relative" }}>
                <Virtuoso
                    ref={virtuosoRef}
                    style={{ height: "100%", width: "100%" }}
                    totalCount={numPages}
                    overscan={120}
                    rangeChanged={({ startIndex }) => setCurrentPage(startIndex)}
                    itemContent={(index) => (
                        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                            <div style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background: "#fff" }}>
                                <PdfPage
                                    pdf={pdf}
                                    pageIndex={index}
                                    scale={scale}
                                    isThumb={false}
                                    isActivePage={index === currentPage}
                                />
                            </div>
                        </div>
                    )}
                />
            </div>

            {/* Controls */}
            <div className="image-preview-bar" style={{ zIndex: 1001 }}>
                <div className="new-preview-zoom-controls-sub">
                    <button
                        className="image-preview-btn"
                        onClick={() => setShowSidebar((prev) => !prev)}
                        title="Toggle Sidebar"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </button>
                </div>

                <div className="new-preview-zoom-controls-sub after-line-horizontal" style={{ padding: "0 10px", gap: "8px", minWidth: "120px" }}>
                    <button
                        className="image-preview-btn"
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        style={{ opacity: scale <= 0.5 ? 0.35 : 1 }}
                    >
                        <InteractiveIcon
                            defaultIcon={nagativIcon}
                            width={24}
                            alt="Zoom Out"
                            customStyle={{ cursor: scale <= 0.5 ? "not-allowed" : "pointer" }}
                        />
                    </button>
                    <span className="image-preview-pct" style={{ minWidth: "45px" }}>{Math.round(scale * 100)}%</span>
                    <button
                        className="image-preview-btn"
                        onClick={zoomIn}
                        disabled={scale >= 3}
                        style={{ opacity: scale >= 3 ? 0.35 : 1 }}
                    >
                        <InteractiveIcon
                            defaultIcon={plusIcon}
                            width={24}
                            alt="Zoom In"
                            customStyle={{ cursor: scale >= 3 ? "not-allowed" : "pointer" }}
                        />
                    </button>
                </div>

                <div className="new-preview-zoom-controls-sub">
                    <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
                        <InteractiveIcon defaultIcon={magnificationIcon} width={24} alt="Reset Zoom" />
                    </button>
                </div>

                {numPages > 0 && (
                    <div className="new-preview-zoom-controls-sub" style={{ padding: "0 10px", fontSize: "12px", fontWeight: "500", minWidth: "60px" }}>
                        <span>{currentPage + 1} / {numPages}</span>
                    </div>
                )}
            </div>

        </div>
    )
}

export default PdfViewer
