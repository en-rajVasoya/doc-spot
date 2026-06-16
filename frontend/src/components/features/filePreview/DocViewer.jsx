import { useEffect, useRef, useState, useCallback } from "react"
import { renderAsync } from "docx-preview"
// import FeatherIcon from "feather-icons-react"
import fileIcon from "@images/svgs/file.svg"
const MAX_FILE_SIZE = 55 * 1024 * 1024
const LoadingScreen = () => (
    <div className="pdf-preview__loading">
        <div className='file-upload-loader-container'>
            <div className='file-upload-loader'></div>
        </div>
    </div>
)
function parseChartXml(xmlStr) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlStr, "application/xml")
    const ns = "http://schemas.openxmlformats.org/drawingml/2006/chart"
    const ans = "http://schemas.openxmlformats.org/drawingml/2006/main"
    const getTag = (el, tag) => el.getElementsByTagNameNS(ns, tag)
    const getVal = (el, tag) => {
        const nodes = getTag(el, tag)
        return nodes.length ? nodes[0].getAttribute("val") : null
    }
    const chartTypes = ["barChart", "lineChart", "pieChart", "scatterChart", "areaChart", "doughnutChart"]
    let chartType = null
    let chartEl = null
    for (const t of chartTypes) {
        const els = doc.getElementsByTagNameNS(ns, t)
        if (els.length) { chartType = t; chartEl = els[0]; break }
    }
    if (!chartType) return null
    const barDir = chartEl ? getVal(chartEl, "barDir") : null
    const grouping = chartEl ? getVal(chartEl, "grouping") : null
    const seriesEls = doc.getElementsByTagNameNS(ns, "ser")
    const series = []
    for (const ser of seriesEls) {
        const txPt = ser.getElementsByTagNameNS(ns, "tx")[0]?.getElementsByTagNameNS(ns, "pt")[0]
        const name = txPt?.getElementsByTagNameNS(ns, "v")[0]?.textContent || "Series"
        const clrEl = ser.getElementsByTagNameNS(ans, "srgbClr")[0]
        const color = clrEl ? "#" + clrEl.getAttribute("val") : null
        const catPts = ser.getElementsByTagNameNS(ns, "cat")[0]?.getElementsByTagNameNS(ns, "pt") || []
        const categories = Array.from(catPts).map(p => p.getElementsByTagNameNS(ns, "v")[0]?.textContent || "")
        const valPts = ser.getElementsByTagNameNS(ns, "val")[0]?.getElementsByTagNameNS(ns, "pt") || []
        const values = Array.from(valPts).map(p => parseFloat(p.getElementsByTagNameNS(ns, "v")[0]?.textContent || 0))
        series.push({ name, color, categories, values })
    }
    const categories = series[0]?.categories || []
    return { chartType, barDir, grouping, series, categories }
}
function drawChart(ctx, chartData, width, height) {
    const { chartType, barDir, grouping, series, categories } = chartData
    const defaultColors = ["#004586", "#ff420e", "#ffd320", "#579d1c", "#7e0021", "#83caff"]
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    const padTop = 20, padBottom = 60, padLeft = 50, padRight = 20
    const chartW = width - padLeft - padRight
    const chartH = height - padTop - padBottom
    if (chartType === "barChart") {
        const isStacked = grouping === "stacked" || grouping === "percentStacked"
        const allVals = series.flatMap(s => s.values)
        const maxVal = isStacked
            ? Math.max(...categories.map((_, ci) => series.reduce((sum, s) => sum + (s.values[ci] || 0), 0)))
            : Math.max(...allVals, 0)
        const minVal = Math.min(...allVals, 0)
        const range = maxVal - minVal || 1
        const numSeries = series.length
        const groupGap = 10
        const barGap = 2
        const totalBarW = (chartW - groupGap * (categories.length - 1)) / categories.length
        const barW = isStacked ? totalBarW : (totalBarW - barGap * (numSeries - 1)) / numSeries
        ctx.strokeStyle = "#e0e0e0"
        ctx.lineWidth = 1
        for (let i = 0; i <= 5; i++) {
            const val = minVal + (range / 5) * i
            const y = padTop + chartH - ((val - minVal) / range) * chartH
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + chartW, y); ctx.stroke()
            ctx.fillStyle = "#888"; ctx.font = "10px sans-serif"; ctx.textAlign = "right"
            ctx.fillText(val.toFixed(1), padLeft - 5, y + 3)
        }
        categories.forEach((cat, ci) => {
            const groupX = padLeft + ci * (totalBarW + groupGap)
            let stackOffset = 0
            series.forEach((ser, si) => {
                const val = ser.values[ci] || 0
                const color = ser.color || defaultColors[si % defaultColors.length]
                const barX = isStacked ? groupX : groupX + si * (barW + barGap)
                const barH = (Math.abs(val) / range) * chartH
                const barY = isStacked
                    ? padTop + chartH - ((stackOffset + val - minVal) / range) * chartH
                    : padTop + chartH - ((val - minVal) / range) * chartH
                ctx.fillStyle = color
                ctx.fillRect(barX, barY, barW, barH)
                if (isStacked) stackOffset += val
            })
            ctx.fillStyle = "#555"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"
            ctx.fillText(cat, groupX + totalBarW / 2, padTop + chartH + 16)
        })
    } else if (chartType === "lineChart" || chartType === "areaChart") {
        const allVals = series.flatMap(s => s.values)
        const maxVal = Math.max(...allVals, 0)
        const minVal = Math.min(...allVals, 0)
        const range = maxVal - minVal || 1
        ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1
        for (let i = 0; i <= 5; i++) {
            const val = minVal + (range / 5) * i
            const y = padTop + chartH - ((val - minVal) / range) * chartH
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + chartW, y); ctx.stroke()
            ctx.fillStyle = "#888"; ctx.font = "10px sans-serif"; ctx.textAlign = "right"
            ctx.fillText(val.toFixed(1), padLeft - 5, y + 3)
        }
        series.forEach((ser, si) => {
            const color = ser.color || defaultColors[si % defaultColors.length]
            const pts = ser.values.map((v, i) => ({
                x: padLeft + (i / (ser.values.length - 1 || 1)) * chartW,
                y: padTop + chartH - ((v - minVal) / range) * chartH,
            }))
            if (chartType === "areaChart") {
                ctx.beginPath()
                ctx.moveTo(pts[0].x, padTop + chartH)
                pts.forEach(p => ctx.lineTo(p.x, p.y))
                ctx.lineTo(pts[pts.length - 1].x, padTop + chartH)
                ctx.closePath(); ctx.fillStyle = color + "40"; ctx.fill()
            }
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
            ctx.stroke()
            pts.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
                ctx.fillStyle = color; ctx.fill()
            })
        })
        categories.forEach((cat, i) => {
            const x = padLeft + (i / (categories.length - 1 || 1)) * chartW
            ctx.fillStyle = "#555"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"
            ctx.fillText(cat, x, padTop + chartH + 16)
        })
    } else if (chartType === "pieChart" || chartType === "doughnutChart") {
        const vals = series[0]?.values || []
        const total = vals.reduce((a, b) => a + b, 0) || 1
        const cx = padLeft + chartW / 2
        const cy = padTop + chartH / 2
        const r = Math.min(chartW, chartH) / 2 - 10
        const inner = chartType === "doughnutChart" ? r * 0.5 : 0
        let angle = -Math.PI / 2
        vals.forEach((val, i) => {
            const slice = (val / total) * Math.PI * 2
            const color = defaultColors[i % defaultColors.length]
            ctx.beginPath(); ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, r, angle, angle + slice)
            if (inner > 0) ctx.arc(cx, cy, inner, angle + slice, angle, true)
            ctx.closePath(); ctx.fillStyle = color; ctx.fill()
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke()
            const midAngle = angle + slice / 2
            const lx = cx + Math.cos(midAngle) * (r * 0.7)
            const ly = cy + Math.sin(midAngle) * (r * 0.7)
            ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"
            ctx.fillText(Math.round(val / total * 100) + "%", lx, ly)
            angle += slice
        })
    }
    const legendY = height - 18
    let legendX = padLeft
    series.forEach((ser, si) => {
        const color = ser.color || defaultColors[si % defaultColors.length]
        ctx.fillStyle = color; ctx.fillRect(legendX, legendY, 12, 12)
        ctx.fillStyle = "#333"; ctx.font = "11px sans-serif"; ctx.textAlign = "left"
        ctx.fillText(ser.name, legendX + 16, legendY + 10)
        legendX += ctx.measureText(ser.name).width + 36
    })
}
function makeChartCanvas(chartData, w = 480, h = 300) {
    const canvas = document.createElement("canvas")
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + "px"
    canvas.style.height = h + "px"
    canvas.style.display = "block"
    const ctx = canvas.getContext("2d")
    ctx.scale(dpr, dpr)
    drawChart(ctx, chartData, w, h)
    return canvas
}
function findChartPlaceholders(containerEl) {
    const candidates = []
    containerEl.querySelectorAll(
        'span[style*="display:inline-block"], div[style*="display:inline-block"], ' +
        'span[style*="display: inline-block"], div[style*="display: inline-block"]'
    ).forEach(el => {
        const style = el.getAttribute("style") || ""
        const wMatch = style.match(/width:\s*([\d.]+)(px|pt|cm|in|em)/)
        const hMatch = style.match(/height:\s*([\d.]+)(px|pt|cm|in|em)/)
        if (!wMatch || !hMatch) return
        // Convert to px roughly for threshold check
        const toPx = (val, unit) => {
            const n = parseFloat(val)
            if (unit === "pt") return n * 1.333
            if (unit === "cm") return n * 37.8
            if (unit === "in") return n * 96
            return n
        }
        const w = toPx(wMatch[1], wMatch[2])
        const h = toPx(hMatch[1], hMatch[2])
        if (w < 50 || h < 50) return
        // Check it has no actual visible/meaningful content
        // (text nodes, images, SVG paths, canvas)
        const hasText = el.innerText?.trim().length > 0
        const hasImage = el.querySelector("img, canvas, path, circle, line, polyline, rect[width]")
        if (hasText || hasImage) return
        candidates.push({ el, w, h })
    })
    // Sort top-to-bottom by DOM position so charts inject in document order
    candidates.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el)
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
    return candidates.map(c => c.el)
}
function getChartRootElement(el) {
    let current = el
    // Walk up until we find the element that is a direct child of the page/section
    // docx-preview structure: section.docx > div(paragraph) > span(drawing wrapper) > span(placeholder)
    while (current.parentElement) {
        const parent = current.parentElement
        const parentStyle = parent.getAttribute("style") || ""
        const parentClass = parent.className || ""
        // Stop if parent is the page/section itself
        if (
            parent.tagName === "SECTION" ||
            parentClass.includes("docx") ||
            parentClass.includes("page")
        ) break
        // Stop if parent has meaningful content BESIDES our current element
        const siblings = Array.from(parent.childNodes).filter(
            n => n !== current && (
                (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) ||
                (n.nodeType === Node.ELEMENT_NODE && (
                    n.innerText?.trim().length > 0 ||
                    n.querySelector?.("img, canvas, path")
                ))
            )
        )
        if (siblings.length > 0) break
        // If parent itself has an explicit height reserved, this is our culprit
        if (parentStyle.match(/height:\s*[\d.]/)) {
            current = parent
            continue
        }
        current = parent
    }
    return current
}
async function injectCharts(containerEl, blob) {
    try {
        const JSZip = (await import("jszip")).default
        const zip = await JSZip.loadAsync(blob)
        const chartFiles = Object.keys(zip.files)
            .filter(f => /^word\/charts\/chart\d+\.xml$/i.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/chart(\d+)/)?.[1] || 0)
                const nb = parseInt(b.match(/chart(\d+)/)?.[1] || 0)
                return na - nb
            })
        if (!chartFiles.length) return
        const chartDataList = []
        for (const cf of chartFiles) {
            const xml = await zip.files[cf].async("text")
            const parsed = parseChartXml(xml)
            if (parsed) chartDataList.push(parsed)
        }
        if (!chartDataList.length) return
        // Debug log — remove after confirming correct placeholder is found
        if (process.env.NODE_ENV === "development") {
            console.log("=== Chart debug ===")
            console.log("Charts in zip:", chartFiles)
            console.log("SVGs in DOM:", containerEl.querySelectorAll("svg").length)
            containerEl.querySelectorAll("svg").forEach((svg, i) => {
                console.log(`SVG[${i}]`, {
                    w: svg.getAttribute("width"),
                    h: svg.getAttribute("height"),
                    children: svg.children.length,
                    html: svg.innerHTML.substring(0, 120)
                })
            })
            const blocks = containerEl.querySelectorAll(
                'span[style*="display:inline-block"], div[style*="display:inline-block"]'
            )
            console.log("Inline-block wrappers:", blocks.length)
            blocks.forEach((el, i) => {
                console.log(`Wrapper[${i}]`, {
                    style: el.getAttribute("style"),
                    html: el.innerHTML.substring(0, 80)
                })
            })
        }
        const placeholders = findChartPlaceholders(containerEl)
        if (placeholders.length > 0) {
            placeholders.forEach((el, i) => {
                if (i >= chartDataList.length) return
                // Find the true root element to replace (kills the blank space)
                const rootEl = getChartRootElement(el)
                const style = rootEl.getAttribute("style") || ""
                const wMatch = style.match(/width:\s*([\d.]+)(px|pt|cm|in|em)/)
                const hMatch = style.match(/height:\s*([\d.]+)(px|pt|cm|in|em)/)
                const toPx = (val, unit) => {
                    const n = parseFloat(val)
                    if (unit === "pt") return n * 1.333
                    if (unit === "cm") return n * 37.8
                    if (unit === "in") return n * 96
                    return n
                }
                // Fall back to reading from original el if root has no size
                const sizeStyle = (wMatch && hMatch) ? style : (el.getAttribute("style") || "")
                const wM = sizeStyle.match(/width:\s*([\d.]+)(px|pt|cm|in|em)/)
                const hM = sizeStyle.match(/height:\s*([\d.]+)(px|pt|cm|in|em)/)
                const w = wM ? Math.round(toPx(wM[1], wM[2])) : 480
                const h = hM ? Math.round(toPx(hM[1], hM[2])) : 300
                const canvas = makeChartCanvas(chartDataList[i], w, h)
                const wrapper = document.createElement("div")
                wrapper.style.cssText = `display:block;margin:10px 0;`
                wrapper.appendChild(canvas)
                // Replace the ROOT element, not just the inner placeholder
                rootEl.replaceWith(wrapper)
            })
        } else {
            // Fallback: append at bottom
            chartDataList.forEach(data => {
                const wrapper = document.createElement("div")
                wrapper.style.cssText = "margin:20px auto;text-align:center;"
                wrapper.appendChild(makeChartCanvas(data))
                containerEl.appendChild(wrapper)
            })
        }
    } catch (e) {
        console.warn("Chart injection error:", e)
    }
}
function DocViewer({ file: fileData }) {
    const containerRef = useRef(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isLegacyDoc, setIsLegacyDoc] = useState(false)
    const [scale, setScale] = useState(1)
    const blobRef = useRef(null)
    const handleDownload = useCallback(() => {
        if (!fileData) return
        const url = fileData instanceof File || fileData instanceof Blob
            ? URL.createObjectURL(fileData)
            : fileData?.storagePath ? fileData.storagePath : fileData
        if (!url) return
        const a = document.createElement("a")
        a.href = url
        a.download = fileData?.name || "document"
        a.click()
        if (fileData instanceof File || fileData instanceof Blob) URL.revokeObjectURL(url)
    }, [fileData])
    useEffect(() => {
        if (!fileData) return
        setLoading(true)
        setError(null)
        setIsLegacyDoc(false)
        const load = async () => {
            try {
                const fileName = fileData?.name || fileData?.storagePath || ""
                const fileExtension = fileName.split(".").pop()?.toLowerCase()
                if (fileExtension === "doc") {
                    setIsLegacyDoc(true)
                    setLoading(false)
                    return
                }
                if (fileData?.fileSize > MAX_FILE_SIZE) {
                    setError("File is too large to preview. Maximum size is 55MB.")
                    setLoading(false)
                    return
                }
                let blob = null
                console.log("fileData -->", fileData)
                if (fileData instanceof File || fileData instanceof Blob) {
                    blob = fileData
                } else if (fileData instanceof ArrayBuffer) {
                    blob = new Blob([fileData])
                } else if (typeof fileData === "object" && fileData?.storagePath) {
                    const url = fileData.storagePath
                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                            Accept: "application/octet-stream",
                        },
                    })
                    if (!response.ok) throw new Error(`Server returned status: ${response.status}`)
                    blob = await response.blob()
                    if (blob.size === 0) throw new Error("Empty file received")
                } else {
                    throw new Error("Unsupported file format")
                }
                blobRef.current = blob
                if (containerRef.current) {
                    containerRef.current.innerHTML = ""
                    await renderAsync(blob, containerRef.current, null, {
                        className: "docx-preview",
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        ignoreLastRenderedPageBreak: true,
                        experimental: false,
                        trimXmlDeclaration: true,
                        useBase64URL: true,
                        renderChanges: false,
                        renderHeaders: true,
                        renderFooters: true,
                        renderFootnotes: true,
                        renderEndnotes: true,
                    })
                    await injectCharts(containerRef.current, blob)
                }
                setLoading(false)
            } catch (err) {
                console.error("DOC load error:", err)
                setError("Failed to load document preview.")
                setLoading(false)
            }
        }
        load()
    }, [fileData])
    const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)
    const zoomIn = () => setScale(prev => clampScale(Math.round((prev + 0.2) * 10) / 10))
    const zoomOut = () => setScale(prev => clampScale(Math.round((prev - 0.2) * 10) / 10))
    const resetZoom = () => setScale(1)
    if (isLegacyDoc) {
        return (
            <div className="preview-toobig">
                <div className="txt-toobig-icon"><img src={fileIcon} alt="" width={38} /></div>
                <p className="preview-toobig-title m-0">{fileData?.name || "Document"}</p>
                <p className="mute-text">Legacy .doc files cannot be previewed. Download the file to open it in MS Word or LibreOffice.</p>
                <button className="btn-primary btn mt-2" onClick={handleDownload}>
                    {/* <FeatherIcon icon="download" size={16} className="me-2" />Download */}
                    Download
                </button>
            </div>
        )
    }
    if (error) {
        return (
            <div className="preview-toobig">
                <div className="txt-toobig-icon"><img src={fileIcon} alt="" width={38} /></div>
                <p className="preview-toobig-title m-0">Preview not available</p>
                <p className="mute-text">{error}</p>
                <button className="btn-primary btn mt-2" onClick={handleDownload}>
                    {/* <FeatherIcon icon="download" size={16} className="me-2" /> */}
                    Download
                </button>
            </div>
        )
    }
    return (
        <div className="doc-preview" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
            {loading && <LoadingScreen />}
            <div className="doc-preview__content" style={{ 
                visibility: loading ? "hidden" : "visible",
                flex: 1,
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                paddingTop: "20px"
            }}>
                <div style={{
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    background: "#fff",
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                    minWidth: "fit-content",
                }}>
                    <div ref={containerRef} className="docx-preview-container" />
                </div>
            </div>
            {!loading && (
                <div className="image-preview-bar">
                    <div className="new-preview-zoom-controls-sub after-line-horizontal">
                        <button
                            className={`image-preview-btn${scale <= 0.5 ? " pdf-preview__btn--disabled" : ""}`}
                            onClick={zoomOut} disabled={scale <= 0.5}
                        >
                            {/* <FeatherIcon icon="minus" size={20} /> */}
                        </button>
                       
                        <button
                            className={`image-preview-btn${scale >= 3 ? " pdf-preview__btn--disabled" : ""}`}
                            onClick={zoomIn} disabled={scale >= 3}
                        >
                            {/* <FeatherIcon icon="plus" size={20} /> */}
                        </button>
                    </div>
                    <div className="new-preview-zoom-controls-sub">
                        <button className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
                            {/* <FeatherIcon icon={scale > 1 ? "zoom-out" : "zoom-in"} size={20} /> */}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
export default DocViewer