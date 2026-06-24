import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
import downloadIcon from "@images/icon/download.svg";
import excelFileIcon from "@images/svgs/media/zip-file.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";

const ROW_HEIGHT = 28;
const DEFAULT_COL_WIDTH = 120;
const BUFFER = 20;

const colCache = {};

const getColumnName = (n) => {
    if (colCache[n]) return colCache[n];
    let name = "";
    let num = n;
    while (num >= 0) {
        name = String.fromCharCode((num % 26) + 65) + name;
        num = Math.floor(num / 26) - 1;
    }
    colCache[n] = name;
    return name;
};

const EXCEL_PREVIEW_LIMIT = 20 * 1024 * 1024; // 20 MB

function ExcelViewer({ file }) {

    const { downloadFile } = useDownload();
    const fileUrl = file?.url || file?.storagePath || "";

    const [checkingSize, setCheckingSize] = useState(!(file?.size || file?.fileSize));
    const [tooBig, setTooBig] = useState(() => {
        const size = file?.size || file?.fileSize || 0;
        return size ? size > EXCEL_PREVIEW_LIMIT : false;
    });
    const [workbook, setWorkbook] = useState(null);
    const [activeSheet, setActiveSheet] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);

    const [sheetData, setSheetData] = useState([]);
    const [maxCols, setMaxCols] = useState(26);

    const [selection, setSelection] = useState({ type: "cell", r: -1, c: -1 });
    const [rangeSelection, setRangeSelection] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const [colWidths, setColWidths] = useState({});
    const resizingCol = useRef(null);
    const viewportRef = useRef(null);
    const sheetCache = useRef({});

    // load workbook
    useEffect(() => {
        const loadExcel = async () => {
            try {
                let currentSize = file?.size || file?.fileSize;

                if (!currentSize) {
                    try {
                        const r = await fetch(fileUrl, { method: "HEAD" });
                        currentSize = Number(r.headers.get("content-length") || 0);
                    } catch (e) { }
                }

                setCheckingSize(false);

                if (currentSize > EXCEL_PREVIEW_LIMIT) {
                    setTooBig(true);
                    return;
                }

                setLoading(true);

                const res = await fetch(fileUrl);
                const buffer = await res.arrayBuffer();

                const bufferSizeMB = buffer.byteLength / (1024 * 1024);
                if (bufferSizeMB > 20) {
                    setTooBig(true);
                    setLoading(false);
                    return;
                }

                const wb = XLSX.read(buffer, { type: "array" });
                setWorkbook(wb);
                setActiveSheet(wb.SheetNames[0]);

            } catch (err) {
                console.error(err);
                setError("Failed to open spreadsheet.");
            } finally {
                setLoading(false);
            }
        };

        setError(null);
        setTooBig(false);
        setCheckingSize(!(file?.size || file?.fileSize));
        loadExcel();
    }, [file, fileUrl]);

    // viewport height
    useEffect(() => {
        const updateHeight = () => {
            if (viewportRef.current) {
                setViewportHeight(viewportRef.current.offsetHeight);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    // load sheet
    useEffect(() => {
        if (!workbook || !activeSheet) return;

        if (sheetCache.current[activeSheet]) {
            const cached = sheetCache.current[activeSheet];
            setSheetData(cached.data);
            setMaxCols(cached.cols);
        } else {
            const ws = workbook.Sheets[activeSheet];

            // 1. Manually find the TRUE range of cells that actually contain data
            // This completely bypasses the "Phantom Cells" freezing problem!
            let maxR = -1;
            let maxC = -1;

            for (const key in ws) {
                if (key[0] === "!") continue; // skip metadata
                const cellObj = ws[key];

                // Only count cells that actually have text or numbers
                if (cellObj && cellObj.v !== undefined && cellObj.v !== null && cellObj.v !== "") {
                    const cell = XLSX.utils.decode_cell(key);
                    if (cell.r > maxR) maxR = cell.r;
                    if (cell.c > maxC) maxC = cell.c;
                }
            }

            // 2. Override the corrupted sheet range with the true, tight bounds
            let finalCols = 26; // Default fallback
            if (maxR >= 0 && maxC >= 0) {
                // Hard cap columns to 500 and rows to 50,000 for extreme safety
                const safeMaxC = Math.min(maxC, 500);
                const safeMaxR = Math.min(maxR, 50000);

                ws["!ref"] = XLSX.utils.encode_range({
                    s: { c: 0, r: 0 },
                    e: { c: safeMaxC, r: safeMaxR }
                });
                finalCols = safeMaxC + 1; // Only show exactly the columns that have data!
            } else {
                ws["!ref"] = "A1:Z1";
            }

            // 3. Now we can safely use sheet_to_json and it will be lightning fast!
            const allData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

            sheetCache.current[activeSheet] = { data: allData, cols: finalCols };
            setSheetData(allData);
            setMaxCols(finalCols);
        }

        setScrollTop(0);
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
        setSelection({ type: "cell", r: -1, c: -1 });
        setRangeSelection(null);
    }, [workbook, activeSheet]);

    // copy
    useEffect(() => {
        const handleCopy = (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            if (e.key !== "c") return;

            let text = "";

            if (rangeSelection) {
                const minRow = Math.min(rangeSelection.startRow, rangeSelection.endRow);
                const maxRow = Math.max(rangeSelection.startRow, rangeSelection.endRow);
                const minCol = Math.min(rangeSelection.startCol, rangeSelection.endCol);
                const maxCol = Math.max(rangeSelection.startCol, rangeSelection.endCol);
                const rows = [];
                for (let r = minRow; r <= maxRow; r++) {
                    const cols = [];
                    for (let c = minCol; c <= maxCol; c++) {
                        cols.push(sheetData[r]?.[c] ?? "");
                    }
                    rows.push(cols.join("\t"));
                }
                text = rows.join("\n");
            } else if (selection.type === "cell" && selection.r !== -1) {
                text = sheetData[selection.r]?.[selection.c] ?? "";
            } else if (selection.type === "col" && selection.c !== -1) {
                text = sheetData.map(row => row[selection.c] ?? "").join("\n");
            } else if (selection.type === "row" && selection.r !== -1) {
                text = (sheetData[selection.r] || []).join("\t");
            }

            if (text !== "") navigator.clipboard.writeText(text);
        };

        window.addEventListener("keydown", handleCopy);
        return () => window.removeEventListener("keydown", handleCopy);
    }, [selection, sheetData, rangeSelection]);

    // stop dragging globally
    useEffect(() => {
        window.addEventListener("mouseup", stopRangeSelection);
        return () => window.removeEventListener("mouseup", stopRangeSelection);
    }, [isDragging]);

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const endIndex = Math.min(
        sheetData.length,
        Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER
    );
    const visibleRows = sheetData.slice(startIndex, endIndex);

    const handleScroll = (e) => setScrollTop(e.target.scrollTop);

    const startRangeSelection = (r, c) => {
        setIsDragging(true);
        setRangeSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
        setSelection({ type: "cell", r, c });
    };

    const updateRangeSelection = (r, c) => {
        if (!isDragging) return;
        setRangeSelection(prev => ({ ...prev, endRow: r, endCol: c }));
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const mouseY = window.event?.clientY || 0;
        if (mouseY > rect.bottom - 40) viewport.scrollTop += 20;
        if (mouseY < rect.top + 40) viewport.scrollTop -= 20;
    };

    const stopRangeSelection = () => setIsDragging(false);

    const startResizing = (e, index) => {
        e.preventDefault();
        resizingCol.current = {
            index,
            startMouseX: e.pageX,
            startWidth: colWidths[index] || DEFAULT_COL_WIDTH
        };
        document.addEventListener("mousemove", handleResizing);
        document.addEventListener("mouseup", stopResizing);
        document.body.style.cursor = "col-resize";
    };

    const handleResizing = (e) => {
        if (!resizingCol.current) return;
        const { index, startMouseX, startWidth } = resizingCol.current;
        setColWidths(prev => ({
            ...prev,
            [index]: Math.max(50, startWidth + (e.pageX - startMouseX))
        }));
    };

    const stopResizing = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", handleResizing);
        document.removeEventListener("mouseup", stopResizing);
        document.body.style.cursor = "default";
    };

    if (checkingSize || loading) return (
        <div className="excel-loader">
            <div className="loader-wrapper-box">
                <div className="cma-messages-are-loader-wrapper">
                    <span className="loader"></span>
                </div>
            </div>
        </div>
    );

    if (tooBig || error) {
        const sizeToDisplay = file?.size || file?.fileSize;
        const fileSizeMB = sizeToDisplay ? (sizeToDisplay / (1024 * 1024)).toFixed(1) : null;

        return (
            <div className="preview-toobig">
                <div className="txt-toobig-icon">
                    <InteractiveIcon
                        defaultIcon={excelFileIcon}
                        width={36}
                        height={42}
                        alt=""
                    />
                </div>
                <p className="preview-toobig-title m-0">
                    {tooBig ? "File too large to preview" : "Could not load spreadsheet"}
                </p>
                <p className="mute-text">
                    {tooBig ? (
                        <>
                            {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
                            Files larger than 20 MB cannot be previewed.
                        </>
                    ) : (
                        error || "This file could not be parsed. Download it to view on your device."
                    )}
                </p>
                <button
                    className="preview-btn preview-btn-text"
                    onClick={() => downloadFile(file)}
                >
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
    }

    return (
        <div className="excel-preview">

            <div className="excel-header-bar">
                <div className="cell-address">
                    {selection.r !== -1 ? `${getColumnName(selection.c)}${selection.r + 1}` : ""}
                </div>
                <div className="formula-bar">
                    {selection.r !== -1 && sheetData[selection.r]
                        ? sheetData[selection.r][selection.c]
                        : ""}
                </div>
            </div>

            <div
                className="grid-viewport"
                ref={viewportRef}
                onScroll={handleScroll}
            >
                <div
                    style={{
                        height: sheetData.length * ROW_HEIGHT,
                        width: Array.from({ length: maxCols }).reduce(
                            (acc, _, i) => acc + (colWidths[i] || DEFAULT_COL_WIDTH),
                            50
                        ),
                        position: "relative"
                    }}
                >
                    <table
                        className="grid-table"
                        style={{
                            position: "absolute",
                            top: startIndex * ROW_HEIGHT,
                            left: 0
                        }}
                    >
                        <colgroup>
                            <col style={{ width: 50 }} />
                            {Array.from({ length: maxCols }).map((_, i) => (
                                <col key={i} style={{ width: colWidths[i] || DEFAULT_COL_WIDTH }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr style={{ height: 25 }}>
                                <th className="header-cell corner"></th>
                                {Array.from({ length: maxCols }).map((_, i) => (
                                    <th
                                        key={i}
                                        className={`header-cell col-header ${selection.type === "col" && selection.c === i ? "active-header" : ""
                                            }`}
                                        onClick={() => {
                                            setRangeSelection(null);
                                            setSelection({ type: "col", c: i, r: -1 });
                                        }}
                                    >
                                        {getColumnName(i)}
                                        <div
                                            className="resizer"
                                            onMouseDown={(e) => startResizing(e, i)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {visibleRows.map((row, i) => {
                                const realIdx = startIndex + i;
                                const isRowActive = selection.type === "row" && selection.r === realIdx;

                                return (
                                    <tr key={realIdx} className="grid-row">
                                        <th
                                            className={`header-cell row-header ${isRowActive ? "active-header" : ""}`}
                                            onClick={() => {
                                                setRangeSelection(null);
                                                setSelection({ type: "row", r: realIdx, c: -1 });
                                            }}
                                        >
                                            {realIdx + 1}
                                        </th>

                                        {Array.from({ length: maxCols }).map((_, cIdx) => {
                                            const isSelected =
                                                (selection.type === "cell" && selection.r === realIdx && selection.c === cIdx) ||
                                                (selection.type === "col" && selection.c === cIdx) ||
                                                (selection.type === "row" && selection.r === realIdx);

                                            const isInRange =
                                                rangeSelection &&
                                                realIdx >= Math.min(rangeSelection.startRow, rangeSelection.endRow) &&
                                                realIdx <= Math.max(rangeSelection.startRow, rangeSelection.endRow) &&
                                                cIdx >= Math.min(rangeSelection.startCol, rangeSelection.endCol) &&
                                                cIdx <= Math.max(rangeSelection.startCol, rangeSelection.endCol);

                                            return (
                                                <td
                                                    key={cIdx}
                                                    className={`grid-cell ${isSelected ? "selected-cell" : ""} ${isInRange ? "highlighted-range" : ""}`}
                                                    onMouseDown={() => startRangeSelection(realIdx, cIdx)}
                                                    onMouseEnter={() => updateRangeSelection(realIdx, cIdx)}
                                                    onClick={() => {
                                                        setRangeSelection(null);
                                                        setSelection({ type: "cell", r: realIdx, c: cIdx });
                                                    }}
                                                >
                                                    {row[cIdx]}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="sheet-footer">
                {workbook?.SheetNames.map(name => (
                    <div
                        key={name}
                        className={`tab ${activeSheet === name ? "active" : ""}`}
                        onClick={() => setActiveSheet(name)}
                    >
                        {name}
                    </div>
                ))}
            </div>

        </div>
    );
}

export default ExcelViewer;