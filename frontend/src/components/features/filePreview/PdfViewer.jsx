// import { memo, useEffect, useRef, useState, useCallback } from "react"
// import { Virtuoso } from "react-virtuoso"
// import * as pdfjsLib from "pdfjs-dist"
// import { Form } from 'react-bootstrap';
// import fileIcon from "@images/svgs/file.svg"
// import InteractiveIcon from "../../layout/InteractiveIcon";
// import "pdfjs-dist/web/pdf_viewer.css"
// import arrowRightIcon from "@images/icon/arrow-right.svg";
// import plusIcon from "@images/icon/plus.svg";
// import nagativIcon from "@images/icon/negativ-icon.svg";
// import magnificationIcon from "@images/icon/magnification-icon.svg";
// import sidebarIcon from "@images/icon/sidebar-icon.svg";


// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//     "pdfjs-dist/build/pdf.worker.min.mjs",
//     import.meta.url
// ).toString()

// const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
// const CMAP_PACKED = true

// const PageSkeleton = ({ width, height }) => (
//     <div
//         className="pdf-preview__skeleton"
//         style={{ width: `${width}px`, height: `${height}px` }}
//     />
// )

// const PdfPage = memo(function PdfPage({
//     pdf,
//     pageIndex,
//     scale,
//     isThumb = false,
//     isActivePage = false,
//     cachedSize,
//     onSizeReady,
// }) {
//     const canvasRef = useRef(null)
//     const textLayerRef = useRef(null)
//     const renderTaskRef = useRef(null)
//     const textLayerTaskRef = useRef(null)

//     const getInitialSize = () => {
//         if (cachedSize) return cachedSize
//         return { width: isThumb ? 120 : 600, height: isThumb ? 160 : 800 }
//     }

//     const [pageSize, setPageSize] = useState(getInitialSize)
//     const [rendered, setRendered] = useState(false)
//     const [forceRender, setForceRender] = useState(0)

//     useEffect(() => {
//         const handleVisibility = () => {
//             if (document.visibilityState === 'visible') {
//                 setForceRender(prev => prev + 1)
//             }
//         }
//         document.addEventListener('visibilitychange', handleVisibility)
//         return () => document.removeEventListener('visibilitychange', handleVisibility)
//     }, [])

//     useEffect(() => {
//         if (!pdf) return

//         let cancelled = false
//         setRendered(false)

//         const renderPage = async () => {
//             try {
//                 const page = await pdf.getPage(pageIndex + 1)
//                 if (cancelled) return

//                 const dpr = window.devicePixelRatio || 1
//                 const viewport = page.getViewport({ scale })

//                 const canvas = canvasRef.current
//                 if (!canvas) return

//                 canvas.width = viewport.width * dpr
//                 canvas.height = viewport.height * dpr
//                 canvas.style.width = `${viewport.width}px`
//                 canvas.style.height = `${viewport.height}px`

//                 const newSize = { width: viewport.width, height: viewport.height }
//                 setPageSize(newSize)
//                 onSizeReady?.(pageIndex, newSize)

//                 const context = canvas.getContext("2d", { alpha: false })
//                 context.scale(dpr, dpr)

//                 renderTaskRef.current?.cancel()

//                 const renderTask = page.render({ canvasContext: context, viewport })
//                 renderTaskRef.current = renderTask
//                 await renderTask.promise
//                 if (cancelled) return

//                 setRendered(true)

//                 if (!isThumb && textLayerRef.current) {
//                     requestAnimationFrame(async () => {
//                         if (cancelled || !textLayerRef.current) return
//                         try {
//                             textLayerRef.current.innerHTML = ""
//                             textLayerRef.current.style.width = `${viewport.width}px`
//                             textLayerRef.current.style.height = `${viewport.height}px`
//                             textLayerRef.current.style.overflow = "hidden"
//                             textLayerRef.current.style.setProperty("--scale-factor", scale)

//                             const textContent = await page.getTextContent()
//                             if (cancelled || !textLayerRef.current) return

//                             const textViewport = page.getViewport({ scale })

//                             const textLayer = new pdfjsLib.TextLayer({
//                                 textContentSource: textContent,
//                                 container: textLayerRef.current,
//                                 viewport: textViewport,
//                             })
//                             textLayerTaskRef.current = textLayer
//                             await textLayer.render()
//                         } catch (err) {
//                             if (err?.name !== "RenderingCancelledException") {
//                                 console.error(`Page ${pageIndex + 1} text layer error:`, err)
//                             }
//                         }
//                     })
//                 }
//             } catch (err) {
//                 if (err?.name !== "RenderingCancelledException") {
//                     console.error(`Page ${pageIndex + 1} render error:`, err)
//                 }
//                 if (!cancelled) setRendered(true)
//             }
//         }

//         renderPage()

//         return () => {
//             cancelled = true
//             renderTaskRef.current?.cancel()
//             if (textLayerRef.current) textLayerRef.current.innerHTML = ""
//         }
//     }, [pdf, pageIndex, scale, isThumb, forceRender])

//     if (isThumb) {
//         return (
//             <div
//                 className="pdf-preview__thumb-canvas-wrap"
//                 style={{ height: `${pageSize.height}px` }}
//             >
//                 {!rendered && (
//                     <div className="pdf-preview__skeleton-wrap">
//                         <PageSkeleton width={pageSize.width} height={pageSize.height} />
//                     </div>
//                 )}
//                 <canvas
//                     ref={canvasRef}
//                     className={`pdf-preview__thumb-canvas${rendered ? " pdf-preview__canvas--rendered" : ""}`}
//                 />
//             </div>
//         )
//     }

//     return (
//         <div
//             className="pdf-preview__page"
//             style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px`, position: "relative" }}
//         >
//             {!rendered && (
//                 <div className="pdf-preview__skeleton-wrap">
//                     <PageSkeleton width={pageSize.width} height={pageSize.height} />
//                 </div>
//             )}
//             <canvas
//                 ref={canvasRef}
//                 className={`pdf-preview__page-canvas${rendered ? " pdf-preview__canvas--rendered" : ""}`}
//             />
//             {!isThumb && (
//                 <div
//                     ref={textLayerRef}
//                     className="textLayer pdf-preview__text-layer"
//                     style={{
//                         position: "absolute",
//                         top: 0,
//                         left: 0,
//                         pointerEvents: "auto",
//                         overflow: "hidden",
//                         userSelect: "text",
//                         WebkitUserSelect: "text",
//                         zIndex: 10,
//                         opacity: 1
//                     }}
//                 />
//             )}
//         </div>
//     )
// })

// const LoadingScreen = () => (
//     <div className="pdf-preview__loading">
//         <div className="loader-wrapper-box">
//             <div className="cma-messages-are-loader-wrapper">
//                 <span className="loader"></span>
//             </div>
//         </div>
//     </div>
// )

// function PdfViewer({ file: fileData }) {
//     const [pdf, setPdf] = useState(null)
//     const [numPages, setNumPages] = useState(0)
//     const [scale, setScale] = useState(1)
//     const [currentPage, setCurrentPage] = useState(0)
//     const [showSidebar, setShowSidebar] = useState(false)
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(false)
//     const [fileSizeMB, setFileSizeMB] = useState(null)

//     const [pageInput, setPageInput] = useState("")
//     const [pageInputFocused, setPageInputFocused] = useState(false)

//     const pageSizeCache = useRef({})
//     const virtuosoRef = useRef(null)
//     const sidebarVirtuosoRef = useRef(null)
//     const isScrollingProgrammatically = useRef(false)

//     useEffect(() => {
//         if (!fileData) return

//         setLoading(true)
//         setError(false)
//         setPdf(null)
//         setNumPages(0)
//         setCurrentPage(0)
//         setFileSizeMB(null)
//         pageSizeCache.current = {}

//         let loadingTask = null

//         const load = async () => {
//             try {
//                 let source = {}

//                 if (fileData instanceof File || fileData instanceof Blob) {
//                     setFileSizeMB((fileData.size / (1024 * 1024)).toFixed(1))
//                 }

//                 if (fileData instanceof ArrayBuffer) {
//                     source = { data: fileData }
//                 } else if (fileData instanceof Blob || fileData instanceof File) {
//                     source = { data: await fileData.arrayBuffer() }
//                 } else if (typeof fileData === "string") {
//                     source = { url: fileData }
//                 } else if (typeof fileData === "object" && fileData.url) {
//                     source = { url: fileData.url }
//                 } else if (typeof fileData === "object" && fileData.storagePath) {
//                     source = { url: `${fileData.storagePath}`, withCredentials: true }
//                 } else if (typeof fileData === "object" && fileData.data) {
//                     source = { data: fileData.data }
//                 } else {
//                     source = { data: fileData }
//                 }

//                 loadingTask = pdfjsLib.getDocument({
//                     ...source,
//                     cMapUrl: CMAP_URL,
//                     cMapPacked: CMAP_PACKED,
//                 })

//                 const pdfDoc = await loadingTask.promise
//                 setPdf(pdfDoc)
//                 setNumPages(pdfDoc.numPages)
//                 setLoading(false)
//             } catch (err) {
//                 console.error("PDF load error:", err)
//                 setError(true)
//                 setLoading(false)
//             }
//         }

//         load()

//         return () => { loadingTask?.destroy() }
//     }, [fileData])

//     useEffect(() => {
//         if (!pageInputFocused) setPageInput(String(currentPage + 1))
//     }, [currentPage, pageInputFocused])

//     const handleSizeReady = useCallback((index, size) => {
//         pageSizeCache.current[index] = size
//     }, [])

//     const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)
//     const zoomIn = () => setScale((p) => clampScale(Math.round((p + 0.2) * 10) / 10))
//     const zoomOut = () => setScale((p) => clampScale(Math.round((p - 0.2) * 10) / 10))
//     const resetZoom = () => setScale(1)

//     const handleDownload = useCallback(() => {
//         if (!fileData) return
//         const url = fileData instanceof File || fileData instanceof Blob
//             ? URL.createObjectURL(fileData)
//             : typeof fileData === "string" ? fileData : fileData?.url
//         if (!url) return
//         const a = document.createElement("a")
//         a.href = url
//         a.download = fileData?.name || "document.pdf"
//         a.click()
//         if (fileData instanceof File || fileData instanceof Blob) URL.revokeObjectURL(url)
//     }, [fileData])

//     const programmaticScroll = useCallback((index) => {
//         isScrollingProgrammatically.current = true
//         setCurrentPage(index)
//         virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" })
//         setTimeout(() => { isScrollingProgrammatically.current = false }, 600)
//     }, [])

//     const handleThumbnailClick = useCallback((index) => {
//         programmaticScroll(index)
//         sidebarVirtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" })
//     }, [programmaticScroll])

//     const goToPage = useCallback((pageNum) => {
//         const index = pageNum - 1
//         if (index >= 0 && index < numPages) {
//             programmaticScroll(index)
//             sidebarVirtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" })
//         }
//     }, [numPages, programmaticScroll])

//     const handlePageInputChange = (e) => setPageInput(e.target.value)

//     const handlePageInputKeyDown = (e) => {
//         if (e.key === "Enter") {
//             const page = parseInt(pageInput, 10)
//             if (!isNaN(page)) goToPage(page)
//             else setPageInput(String(currentPage + 1))
//             e.target.blur()
//         }
//         if (e.key === "Escape") {
//             setPageInput(String(currentPage + 1))
//             e.target.blur()
//         }
//         if (e.key === "ArrowUp") { e.preventDefault(); goToPage(currentPage + 2) }
//         if (e.key === "ArrowDown") { e.preventDefault(); goToPage(currentPage) }
//     }

//     const handlePageInputBlur = () => {
//         setPageInputFocused(false)
//         const page = parseInt(pageInput, 10)
//         if (!isNaN(page) && page >= 1 && page <= numPages) goToPage(page)
//         else setPageInput(String(currentPage + 1))
//     }

//     const handlePageSelectorSubmit = () => {
//         const page = parseInt(pageInput, 10)
//         if (!isNaN(page)) goToPage(page)
//     }

//     if (loading) return <LoadingScreen />

//     if (error) {
//         return (
//             <div className="preview-toobig">
//                 <div className="txt-toobig-icon">
//                     <img src={fileIcon} alt="" width={38} />
//                 </div>
//                 <p className="preview-toobig-title m-0">File too large to preview</p>
//                 <p className="mute-text">
//                     {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
//                     Files larger than 50 MB cannot be previewed.
//                 </p>
//                 <button className="btn-primary btn mt-2" onClick={handleDownload}>
//                     <InteractiveIcon
//                         defaultIcon={nagativIcon}
//                         width={24}
//                     />
//                     Download
//                 </button>
//             </div>
//         )
//     }

//     return (
//         <div className="pdf-preview">

//             {numPages > 0 && showSidebar && (
//                 <div className="pdf-preview__sidebar">
//                     <div className="pdf-preview__sidebar-scroll">
//                         <Virtuoso
//                             ref={sidebarVirtuosoRef}
//                             style={{ height: "100%" }}
//                             totalCount={numPages}
//                             overscan={80}
//                             defaultItemHeight={200}
//                             itemContent={(index) => (
//                                 <div
//                                     onClick={() => handleThumbnailClick(index)}
//                                     className={`pdf-preview__thumb-item${currentPage === index ? " pdf-preview__thumb-item--active" : ""}`}
//                                 >
//                                     <div className="pdf-preview__thumb-box">
//                                         <PdfPage
//                                             pdf={pdf}
//                                             pageIndex={index}
//                                             scale={0.2}
//                                             isThumb={true}
//                                             cachedSize={
//                                                 pageSizeCache.current[index]
//                                                     ? {
//                                                         width: pageSizeCache.current[index].width * 0.2,
//                                                         height: pageSizeCache.current[index].height * 0.2,
//                                                     }
//                                                     : undefined
//                                             }
//                                             onSizeReady={handleSizeReady}
//                                         />
//                                     </div>
//                                     <span className={`pdf-preview__thumb-label${currentPage === index ? " pdf-preview__thumb-label--active" : ""}`}>
//                                         Page {index + 1}
//                                     </span>
//                                 </div>
//                             )}
//                         />
//                     </div>
//                 </div>
//             )}

//             <div className="pdf-preview__main">
//                 <Virtuoso
//                     ref={virtuosoRef}
//                     style={{ height: "100%", width: "100%" }}
//                     totalCount={numPages}
//                     overscan={120}
//                     defaultItemHeight={860}
//                     rangeChanged={({ startIndex }) => {
//                         if (!isScrollingProgrammatically.current) {
//                             setCurrentPage(startIndex)
//                         }
//                     }}
//                     itemContent={(index) => (
//                         <div className="pdf-preview__page-wrap">
//                             <div className="pdf-preview__page-shadow">
//                                 <PdfPage
//                                     pdf={pdf}
//                                     pageIndex={index}
//                                     scale={scale}
//                                     isThumb={false}
//                                     isActivePage={index === currentPage}
//                                     cachedSize={pageSizeCache.current[index]}
//                                     onSizeReady={handleSizeReady}
//                                 />
//                             </div>
//                         </div>
//                     )}
//                 />
//             </div>

//             <div className="image-preview-bar">

//                 <div className="new-preview-zoom-controls-sub">
//                     <button className="image-preview-btn" onClick={() => setShowSidebar((prev) => !prev)} title="Toggle Sidebar">
//                         <InteractiveIcon
//                             defaultIcon={sidebarIcon}
//                             width={24}
//                         />
//                     </button>
//                 </div>

//                 {numPages > 0 && (
//                     <div className="new-preview-pagination-pdf-single-box">
//                         <div className="d-flex align-items-center new-preview-pagination-pdf-page">
//                             <span className="pdf-page-count me-1">{currentPage + 1}</span>
//                             <span className="pdf-page-of me-1">of</span>
//                             <span className="pdf-page-total me-1">{numPages}</span>
//                         </div>

//                         <div className="new-preview-pagination">
//                             <div className="position-relative d-flex align-items-center">
//                                 <Form.Group className='m-0 form-group'>
//                                     <Form.Control
//                                         type="number"
//                                         min={1}
//                                         max={numPages}
//                                         value={pageInput}
//                                         onChange={handlePageInputChange}
//                                         onFocus={() => { setPageInputFocused(true); setPageInput("") }}
//                                         onBlur={handlePageInputBlur}
//                                         onKeyDown={handlePageInputKeyDown}
//                                     />
//                                 </Form.Group>
//                                 <button className="pageSelectorSubmit" onClick={handlePageSelectorSubmit}>
//                                     <InteractiveIcon
//                                         defaultIcon={arrowRightIcon}
//                                         width={16}
//                                     />
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 <div className="new-preview-zoom-controls-sub after-line-horizontal">
//                     <button
//                         className={`image-preview-btn ${scale <= 0.5 ? " pdf-preview__btn--disabled" : ""}`}
//                         onClick={zoomOut}
//                         disabled={scale <= 0.5}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={nagativIcon}
//                             width={24}
//                         />
//                     </button>
//                     <button
//                         className={`image-preview-btn${scale >= 3 ? " pdf-preview__btn--disabled" : ""}`}
//                         onClick={zoomIn}
//                         disabled={scale >= 3}
//                     >
//                         <InteractiveIcon
//                             defaultIcon={plusIcon}
//                             width={24}
//                         />
//                     </button>
//                 </div>

//                 <div className="new-preview-zoom-controls-sub">
//                     <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
//                         <InteractiveIcon
//                             defaultIcon={magnificationIcon}
//                             width={24}
//                         />
//                     </button>
//                 </div>

//             </div>
//         </div>
//     )
// }

// export default PdfViewer





import { memo, useEffect, useRef, useState, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import * as pdfjsLib from "pdfjs-dist"
import { Form } from 'react-bootstrap';
import pdfFileIcon from "@images/svgs/media/pdf-file.svg"
import InteractiveIcon from "../../layout/InteractiveIcon";
import "pdfjs-dist/web/pdf_viewer.css"
import arrowRightIcon from "@images/icon/arrow-right.svg";
import plusIcon from "@images/icon/plus.svg";
import nagativIcon from "@images/icon/negativ-icon.svg";
import downloadIcon from "@images/icon/download.svg";
import magnificationIcon from "@images/icon/magnification-icon.svg";
import sidebarIcon from "@images/icon/sidebar-icon.svg";
import magnificationIconNegative from "@images/icon/magnification-icon-negative.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";


pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString()

const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
const CMAP_PACKED = true

// max size of the pdf
const MAX_FILE_SIZE_MB = 50

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
        <div className="loader-wrapper-box">
            <div className="cma-messages-are-loader-wrapper">
                <span className="loader"></span>
            </div>
        </div>
    </div>
)

// ✅ Alag component — PDF load hone se pehle hi dikhega
const FileFallbackScreen = ({ fileSizeMB, isTooBig, onDownload }) => (
    <div className="preview-toobig">
        <div className="txt-toobig-icon">
            <InteractiveIcon
                defaultIcon={pdfFileIcon}
                width={36}
                height={42}
                alt=""
            />
        </div>
        <p className="preview-toobig-title m-0">
            {isTooBig ? "File too large to preview" : "Could not load PDF"}
        </p>
        <p className="mute-text">
            {isTooBig ? (
                <>
                    {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
                    Files larger than {MAX_FILE_SIZE_MB} MB cannot be previewed.
                </>
            ) : (
                "This file could not be parsed. Download it to view on your device."
            )}
        </p>
        <button className="preview-btn preview-btn-text mt-2" onClick={onDownload}>
            <InteractiveIcon
                defaultIcon={downloadIcon}
                width={20}
                height={20}
            />
            Download
        </button>
    </div>
)

function PdfViewer({ file: fileData }) {
    const { downloadFile } = useDownload();
    const [pdf, setPdf] = useState(null)
    const [numPages, setNumPages] = useState(0)
    const [scale, setScale] = useState(1)
    const [currentPage, setCurrentPage] = useState(0)
    const [showSidebar, setShowSidebar] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [tooBig, setTooBig] = useState(false)
    const [fileSizeMB, setFileSizeMB] = useState(null)

    const [pageInput, setPageInput] = useState("")
    const [pageInputFocused, setPageInputFocused] = useState(false)

    const pageSizeCache = useRef({})
    const virtuosoRef = useRef(null)
    const sidebarVirtuosoRef = useRef(null)
    const isScrollingProgrammatically = useRef(false)

    useEffect(() => {
        if (!fileData) return

        // ✅ SIZE CHECK — at the very top, before anything else
        const fileBytes = fileData?.fileSize || fileData?.size ||
            (fileData instanceof File ? fileData.size : 0) ||
            (fileData instanceof Blob ? fileData.size : 0) ||
            (fileData instanceof ArrayBuffer ? fileData.byteLength : 0);

        if (fileBytes > 0) {
            const sizeMB = fileBytes / (1024 * 1024);
            setFileSizeMB(parseFloat(sizeMB.toFixed(1)));
            if (sizeMB > MAX_FILE_SIZE_MB) {
                setTooBig(true);
                setLoading(false);
                return; // ← STOP HERE. load() never runs.
            }
        }

        setLoading(true)
        setError(false)
        setTooBig(false)
        setPdf(null)
        setNumPages(0)
        setCurrentPage(0)
        if (!fileBytes) setFileSizeMB(null)
        pageSizeCache.current = {}

        let loadingTask = null

        const load = async () => {
            try {
                let source = {}

                // 🔍 DEBUG: See what fileData looks like
                console.log("PDF fileData:", typeof fileData, fileData)
                console.log("PDF fileData.fileSize:", fileData?.fileSize, "fileData.storagePath:", fileData?.storagePath, "fileData.url:", fileData?.url)
               
                if (fileData instanceof File || fileData instanceof Blob) {
                    const sizeMB = fileData.size / (1024 * 1024)
                    const sizeMBFixed = parseFloat(sizeMB.toFixed(1))
                    setFileSizeMB(sizeMBFixed)

                    if (sizeMB > MAX_FILE_SIZE_MB) {
                        setTooBig(true)
                        setLoading(false)
                        return 
                    }

                    source = { data: await fileData.arrayBuffer() }
                } else if (fileData instanceof ArrayBuffer) {
                    // ✅ ArrayBuffer ke liye size check
                    const sizeMB = fileData.byteLength / (1024 * 1024)
                    const sizeMBFixed = parseFloat(sizeMB.toFixed(1))
                    setFileSizeMB(sizeMBFixed)

                    if (sizeMB > MAX_FILE_SIZE_MB) {
                        setTooBig(true)
                        setLoading(false)
                        return
                    }

                    source = { data: fileData }
                } else if (typeof fileData === "string") {
                    source = { url: fileData }
                } else if (typeof fileData === "object" && fileData.url) {
                    // ✅ Object with url — check fileSize before loading
                    if (fileData.fileSize) {
                        const sizeMB = fileData.fileSize / (1024 * 1024)
                        setFileSizeMB(parseFloat(sizeMB.toFixed(1)))
                        if (sizeMB > MAX_FILE_SIZE_MB) {
                            setTooBig(true)
                            setLoading(false)
                            return
                        }
                    }
                    source = { url: fileData.url }
                } else if (typeof fileData === "object" && fileData.storagePath) {
                    // ✅ Object with storagePath — check fileSize before loading
                    if (fileData.fileSize) {
                        const sizeMB = fileData.fileSize / (1024 * 1024)
                        setFileSizeMB(parseFloat(sizeMB.toFixed(1)))
                        if (sizeMB > MAX_FILE_SIZE_MB) {
                            setTooBig(true)
                            setLoading(false)
                            return
                        }
                    }
                    source = { url: `${fileData.storagePath}`, withCredentials: true }
                } else if (typeof fileData === "object" && fileData.data) {
                    // ✅ data object ke liye size check
                    if (fileData.data?.byteLength) {
                        const sizeMB = fileData.data.byteLength / (1024 * 1024)
                        const sizeMBFixed = parseFloat(sizeMB.toFixed(1))
                        setFileSizeMB(sizeMBFixed)

                        if (sizeMB > MAX_FILE_SIZE_MB) {
                            setTooBig(true)
                            setLoading(false)
                            return
                        }
                    }
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
                setError(true)   // ✅ Error screen dikhao
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
    const resetZoom = () => {
        if (scale !== 1) {
            setScale(1)
        } else {
            setScale(1.5)
        }
    }

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

    // ✅ Loading pehle check karo
    if (loading) return <LoadingScreen />

    // ✅ Error / too large — PDF load hone se pehle hi rok diya, yahan sirf UI dikhao
    if (error || tooBig) {
        return (
            <FileFallbackScreen
                fileSizeMB={fileSizeMB}
                isTooBig={tooBig}
                onDownload={() => downloadFile(fileData)}
            />
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
                        <InteractiveIcon
                            defaultIcon={sidebarIcon}
                            width={24}
                        />
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
                                    <InteractiveIcon
                                        defaultIcon={arrowRightIcon}
                                        width={16}
                                    />
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
                        <InteractiveIcon
                            defaultIcon={nagativIcon}
                            width={24}
                        />
                    </button>
                    <button
                        className={`image-preview-btn${scale >= 3 ? " pdf-preview__btn--disabled" : ""}`}
                        onClick={zoomIn}
                        disabled={scale >= 3}
                    >
                        <InteractiveIcon
                            defaultIcon={plusIcon}
                            width={24}
                        />
                    </button>
                </div>

                <div className="new-preview-zoom-controls-sub">
                    <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
                        <InteractiveIcon
                            defaultIcon={scale > 1 ? magnificationIconNegative : magnificationIcon}
                            width={24}
                        />
                    </button>
                </div>

            </div>
        </div>
    )
}

export default PdfViewer