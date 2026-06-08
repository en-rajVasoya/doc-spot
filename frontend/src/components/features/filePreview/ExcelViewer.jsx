// import { useEffect, useRef, useState, useMemo } from "react"
// import * as XLSX from "xlsx"

// const ROW_HEIGHT = 28
// const DEFAULT_COL_WIDTH = 120
// const BUFFER = 20

// const colCache = {}

// const getColumnName = (n) => {
//     if (colCache[n]) return colCache[n]

//     let name = ""
//     let num = n

//     while (num >= 0) {
//         name = String.fromCharCode((num % 26) + 65) + name
//         num = Math.floor(num / 26) - 1
//     }

//     colCache[n] = name
//     return name
// }

// function ExcelViewer({ file }) {

//     const BASE_URL = import.meta.env.VITE_API_URL
//     const fileUrl = `${BASE_URL}/files${file.storagePath}`

//     const [workbook, setWorkbook] = useState(null)
//     const [activeSheet, setActiveSheet] = useState("")
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(null)

//     const [scrollTop, setScrollTop] = useState(0)
//     const [viewportHeight, setViewportHeight] = useState(600)

//     const [sheetData, setSheetData] = useState([])
//     const [maxCols, setMaxCols] = useState(26)

//     const [selection, setSelection] = useState({
//         type: "cell",
//         r: -1,
//         c: -1
//     })

//     // drag selection
//     const [rangeSelection, setRangeSelection] = useState(null)
//     const [isDragging, setIsDragging] = useState(false)

//     const [colWidths, setColWidths] = useState({})
//     const resizingCol = useRef(null)

//     const viewportRef = useRef(null)
//     const sheetCache = useRef({})

//     // load workbook
//     useEffect(() => {

//         const loadExcel = async () => {
//             try {

//                 setLoading(true)

//                 const res = await fetch(fileUrl)
//                 const buffer = await res.arrayBuffer()

//                 const wb = XLSX.read(buffer, {
//                     type: "array"
//                 })

//                 setWorkbook(wb)
//                 setActiveSheet(wb.SheetNames[0])

//             } catch (err) {

//                 console.error(err)
//                 setError("Failed to open spreadsheet.")

//             } finally {
//                 setLoading(false)
//             }
//         }

//         loadExcel()

//     }, [fileUrl])

//     // viewport height
//     useEffect(() => {

//         const updateHeight = () => {
//             if (viewportRef.current) {
//                 setViewportHeight(
//                     viewportRef.current.offsetHeight
//                 )
//             }
//         }

//         updateHeight()

//         window.addEventListener("resize", updateHeight)

//         return () => {
//             window.removeEventListener("resize", updateHeight)
//         }

//     }, [])

//     // load sheet
//     useEffect(() => {

//         if (!workbook || !activeSheet) return

//         if (sheetCache.current[activeSheet]) {

//             const cached = sheetCache.current[activeSheet]

//             setSheetData(cached.data)
//             setMaxCols(cached.cols)

//         } else {

//             const ws = workbook.Sheets[activeSheet]

//             const range = XLSX.utils.decode_range(
//                 ws["!ref"] || "A1"
//             )

//             const allData = XLSX.utils.sheet_to_json(ws, {
//                 header: 1,
//                 defval: ""
//             })

//             const cols = range.e.c + 1

//             sheetCache.current[activeSheet] = {
//                 data: allData,
//                 cols
//             }

//             setSheetData(allData)
//             setMaxCols(cols)
//         }

//         setScrollTop(0)

//         if (viewportRef.current) {
//             viewportRef.current.scrollTop = 0
//         }

//         setSelection({
//             type: "cell",
//             r: -1,
//             c: -1
//         })

//         setRangeSelection(null)

//     }, [workbook, activeSheet])

//     // copy selected data
//     useEffect(() => {

//         const handleCopy = (e) => {

//             if (!e.ctrlKey && !e.metaKey) return
//             if (e.key !== "c") return

//             let text = ""

//             // drag selected range
//             if (rangeSelection) {

//                 const minRow = Math.min(
//                     rangeSelection.startRow,
//                     rangeSelection.endRow
//                 )

//                 const maxRow = Math.max(
//                     rangeSelection.startRow,
//                     rangeSelection.endRow
//                 )

//                 const minCol = Math.min(
//                     rangeSelection.startCol,
//                     rangeSelection.endCol
//                 )

//                 const maxCol = Math.max(
//                     rangeSelection.startCol,
//                     rangeSelection.endCol
//                 )

//                 const rows = []

//                 for (let r = minRow; r <= maxRow; r++) {

//                     const cols = []

//                     for (let c = minCol; c <= maxCol; c++) {
//                         cols.push(
//                             sheetData[r]?.[c] ?? ""
//                         )
//                     }

//                     rows.push(cols.join("\t"))
//                 }

//                 text = rows.join("\n")
//             }

//             // single cell
//             else if (
//                 selection.type === "cell" &&
//                 selection.r !== -1
//             ) {

//                 text =
//                     sheetData[selection.r]?.[selection.c] ?? ""
//             }

//             // full column
//             else if (
//                 selection.type === "col" &&
//                 selection.c !== -1
//             ) {

//                 text = sheetData
//                     .map(row => row[selection.c] ?? "")
//                     .join("\n")
//             }

//             // full row
//             else if (
//                 selection.type === "row" &&
//                 selection.r !== -1
//             ) {

//                 text = (sheetData[selection.r] || [])
//                     .join("\t")
//             }

//             if (text !== "") {
//                 navigator.clipboard.writeText(text)
//             }
//         }

//         window.addEventListener("keydown", handleCopy)

//         return () => {
//             window.removeEventListener("keydown", handleCopy)
//         }

//     }, [selection, sheetData, rangeSelection])

//     // stop dragging globally
//     useEffect(() => {

//         window.addEventListener(
//             "mouseup",
//             stopRangeSelection
//         )

//         return () => {
//             window.removeEventListener(
//                 "mouseup",
//                 stopRangeSelection
//             )
//         }

//     }, [isDragging])

//     // virtualization
//     const startIndex = Math.max(
//         0,
//         Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
//     )

//     const endIndex = Math.min(
//         sheetData.length,
//         Math.floor(
//             (scrollTop + viewportHeight) / ROW_HEIGHT
//         ) + BUFFER
//     )

//     const visibleRows = sheetData.slice(
//         startIndex,
//         endIndex
//     )

//     const handleScroll = (e) => {
//         setScrollTop(e.target.scrollTop)
//     }

//     // drag selection
//     const startRangeSelection = (r, c) => {

//         setIsDragging(true)

//         setRangeSelection({
//             startRow: r,
//             startCol: c,
//             endRow: r,
//             endCol: c
//         })

//         setSelection({
//             type: "cell",
//             r,
//             c
//         })
//     }

//     const updateRangeSelection = (r, c) => {

//         if (!isDragging) return

//         setRangeSelection(prev => ({
//             ...prev,
//             endRow: r,
//             endCol: c
//         }))

//         // auto scroll while dragging
//         const viewport = viewportRef.current

//         if (!viewport) return

//         const rect = viewport.getBoundingClientRect()
//         const mouseY = window.event?.clientY || 0

//         if (mouseY > rect.bottom - 40) {
//             viewport.scrollTop += 20
//         }

//         if (mouseY < rect.top + 40) {
//             viewport.scrollTop -= 20
//         }
//     }

//     const stopRangeSelection = () => {
//         setIsDragging(false)
//     }

//     // resize
//     const startResizing = (e, index) => {

//         e.preventDefault()

//         resizingCol.current = {
//             index,
//             startMouseX: e.pageX,
//             startWidth:
//                 colWidths[index] || DEFAULT_COL_WIDTH
//         }

//         document.addEventListener(
//             "mousemove",
//             handleResizing
//         )

//         document.addEventListener(
//             "mouseup",
//             stopResizing
//         )

//         document.body.style.cursor = "col-resize"
//     }

//     const handleResizing = (e) => {

//         if (!resizingCol.current) return

//         const {
//             index,
//             startMouseX,
//             startWidth
//         } = resizingCol.current

//         setColWidths(prev => ({
//             ...prev,
//             [index]: Math.max(
//                 50,
//                 startWidth + (e.pageX - startMouseX)
//             )
//         }))
//     }

//     const stopResizing = () => {

//         resizingCol.current = null

//         document.removeEventListener(
//             "mousemove",
//             handleResizing
//         )

//         document.removeEventListener(
//             "mouseup",
//             stopResizing
//         )

//         document.body.style.cursor = "default"
//     }

//     if (loading) {
//         return (
//             <div className="excel-loader">
//                 Loading spreadsheet...
//             </div>
//         )
//     }

//     if (error) {
//         return (
//             <div className="excel-error">
//                 {error}
//             </div>
//         )
//     }

//     return (
//         <div className="pro-excel-container">

//             <style>{`

//                 .pro-excel-container {
//                     display: flex;
//                     flex-direction: column;
//                     height: calc(100vh - 60px);
//                     width: 100%;
//                     background: #ffffff;
//                     font-family: 'Segoe UI', system-ui, sans-serif;
//                     overflow: hidden;
//                     user-select: none;
//                 }

//                 .excel-header-bar {
//                     height: 38px;
//                     background: #f3f3f3;
//                     border-bottom: 1px solid #d1d1d1;
//                     display: flex;
//                     align-items: center;
//                     padding: 0 10px;
//                     font-size: 13px;
//                 }

//                 .cell-address {
//                     width: 65px;
//                     border-right: 1px solid #d1d1d1;
//                     padding-right: 10px;
//                     font-weight: 600;
//                     color: #107c41;
//                     text-align: center;
//                 }

//                 .formula-bar {
//                     flex: 1;
//                     padding-left: 12px;
//                     color: #333;
//                     font-family: monospace;
//                     font-size: 14px;
//                     overflow: hidden;
//                     text-overflow: ellipsis;
//                     white-space: nowrap;
//                 }

//                 .grid-viewport {
//                     flex: 1;
//                     overflow: auto;
//                     position: relative;
//                 }

//                 .grid-table {
//                     border-collapse: collapse;
//                     table-layout: fixed;
//                     width: fit-content;
//                 }

//                 .grid-row {
//                     height: ${ROW_HEIGHT}px;
//                 }

//                 .grid-cell {
//                     border: 1px solid #e1e1e1;
//                     padding: 0 8px;
//                     font-size: 13px;
//                     white-space: nowrap;
//                     overflow: hidden;
//                     text-overflow: ellipsis;
//                     background: white;
//                 }

//                 .header-cell {
//                     background: #f8f9fa;
//                     color: #666;
//                     font-size: 12px;
//                     font-weight: normal;
//                     text-align: center;
//                     border: 1px solid #ccc;
//                     position: sticky;
//                     z-index: 10;
//                 }

//                 .col-header {
//                     top: 0;
//                     height: 25px;
//                     cursor: pointer;
//                 }

//                 .row-header {
//                     left: 0;
//                     width: 50px;
//                     z-index: 11;
//                     cursor: pointer;
//                 }

//                 .corner {
//                     top: 0;
//                     left: 0;
//                     z-index: 12;
//                     width: 50px;
//                     background: #eee;
//                 }

//                 .resizer {
//                     position: absolute;
//                     top: 0;
//                     right: -2px;
//                     width: 5px;
//                     height: 100%;
//                     cursor: col-resize;
//                     z-index: 20;
//                 }

//                 .resizer:hover {
//                     background: #107c41;
//                 }

//                 .selected-cell {
//                     outline: 2px solid #107c41 !important;
//                     outline-offset: -2px;
//                     background: #cfe8d6 !important;
//                     z-index: 5;
//                 }

//                 .highlighted-range {
//                     background: #e7f2ec !important;
//                 }

//                 .active-header {
//                     background: #107c41 !important;
//                     color: white !important;
//                     font-weight: bold;
//                     border-color: #0d6235;
//                 }

//                 .sheet-footer {
//                     height: 35px;
//                     background: #f3f3f3;
//                     border-top: 1px solid #d1d1d1;
//                     display: flex;
//                     align-items: center;
//                     padding: 0 10px;
//                     gap: 2px;
//                 }

//                 .tab {
//                     padding: 0 20px;
//                     height: 100%;
//                     display: flex;
//                     align-items: center;
//                     font-size: 13px;
//                     cursor: pointer;
//                     border-right: 1px solid #d1d1d1;
//                 }

//                 .tab.active {
//                     background: white;
//                     color: #107c41;
//                     font-weight: bold;
//                     border-bottom: 3px solid #107c41;
//                 }

//                 .tab:hover:not(.active) {
//                     background: #e6e6e6;
//                 }

//                 .excel-loader,
//                 .excel-error {
//                     height: 100vh;
//                     display: flex;
//                     align-items: center;
//                     justify-content: center;
//                     background: white;
//                 }

//             `}</style>

//             <div className="excel-header-bar">

//                 <div className="cell-address">
//                     {
//                         selection.r !== -1
//                             ? `${getColumnName(selection.c)}${selection.r + 1}`
//                             : ""
//                     }
//                 </div>

//                 <div className="formula-bar">
//                     {
//                         selection.r !== -1 &&
//                         sheetData[selection.r]
//                             ? sheetData[selection.r][selection.c]
//                             : ""
//                     }
//                 </div>

//             </div>

//             <div
//                 className="grid-viewport"
//                 ref={viewportRef}
//                 onScroll={handleScroll}
//             >

//                 <div
//                     style={{
//                         height: sheetData.length * ROW_HEIGHT,
//                         width: Array.from({
//                             length: maxCols
//                         }).reduce(
//                             (acc, _, i) =>
//                                 acc + (
//                                     colWidths[i] ||
//                                     DEFAULT_COL_WIDTH
//                                 ),
//                             50
//                         ),
//                         position: "relative"
//                     }}
//                 >

//                     <table
//                         className="grid-table"
//                         style={{
//                             position: "absolute",
//                             top: startIndex * ROW_HEIGHT,
//                             left: 0
//                         }}
//                     >

//                         <colgroup>

//                             <col style={{ width: 50 }} />

//                             {
//                                 Array.from({
//                                     length: maxCols
//                                 }).map((_, i) => (
//                                     <col
//                                         key={i}
//                                         style={{
//                                             width:
//                                                 colWidths[i] ||
//                                                 DEFAULT_COL_WIDTH
//                                         }}
//                                     />
//                                 ))
//                             }

//                         </colgroup>

//                         <thead>

//                             <tr style={{ height: 25 }}>

//                                 <th className="header-cell corner"></th>

//                                 {
//                                     Array.from({
//                                         length: maxCols
//                                     }).map((_, i) => (

//                                         <th
//                                             key={i}
//                                             className={`header-cell col-header ${
//                                                 selection.type === "col" &&
//                                                 selection.c === i
//                                                     ? "active-header"
//                                                     : ""
//                                             }`}
//                                             onClick={() => {
//                                                 setRangeSelection(null)

//                                                 setSelection({
//                                                     type: "col",
//                                                     c: i,
//                                                     r: -1
//                                                 })
//                                             }}
//                                         >

//                                             {getColumnName(i)}

//                                             <div
//                                                 className="resizer"
//                                                 onMouseDown={(e) =>
//                                                     startResizing(e, i)
//                                                 }
//                                                 onClick={(e) =>
//                                                     e.stopPropagation()
//                                                 }
//                                             />

//                                         </th>

//                                     ))
//                                 }

//                             </tr>

//                         </thead>

//                         <tbody>

//                             {
//                                 visibleRows.map((row, i) => {

//                                     const realIdx =
//                                         startIndex + i

//                                     const isRowActive =
//                                         selection.type === "row" &&
//                                         selection.r === realIdx

//                                     return (

//                                         <tr
//                                             key={realIdx}
//                                             className="grid-row"
//                                         >

//                                             <th
//                                                 className={`header-cell row-header ${
//                                                     isRowActive
//                                                         ? "active-header"
//                                                         : ""
//                                                 }`}
//                                                 onClick={() => {

//                                                     setRangeSelection(null)

//                                                     setSelection({
//                                                         type: "row",
//                                                         r: realIdx,
//                                                         c: -1
//                                                     })
//                                                 }}
//                                             >

//                                                 {realIdx + 1}

//                                             </th>

//                                             {
//                                                 Array.from({
//                                                     length: maxCols
//                                                 }).map((_, cIdx) => {

//                                                     const isSelected =
//                                                         (
//                                                             selection.type === "cell" &&
//                                                             selection.r === realIdx &&
//                                                             selection.c === cIdx
//                                                         ) ||

//                                                         (
//                                                             selection.type === "col" &&
//                                                             selection.c === cIdx
//                                                         ) ||

//                                                         (
//                                                             selection.type === "row" &&
//                                                             selection.r === realIdx
//                                                         )

//                                                     const isInRange =
//                                                         rangeSelection &&

//                                                         realIdx >= Math.min(
//                                                             rangeSelection.startRow,
//                                                             rangeSelection.endRow
//                                                         ) &&

//                                                         realIdx <= Math.max(
//                                                             rangeSelection.startRow,
//                                                             rangeSelection.endRow
//                                                         ) &&

//                                                         cIdx >= Math.min(
//                                                             rangeSelection.startCol,
//                                                             rangeSelection.endCol
//                                                         ) &&

//                                                         cIdx <= Math.max(
//                                                             rangeSelection.startCol,
//                                                             rangeSelection.endCol
//                                                         )

//                                                     return (

//                                                         <td
//                                                             key={cIdx}
//                                                             className={`grid-cell ${
//                                                                 isSelected
//                                                                     ? "selected-cell"
//                                                                     : ""
//                                                             } ${
//                                                                 isInRange
//                                                                     ? "highlighted-range"
//                                                                     : ""
//                                                             }`}
//                                                             onMouseDown={() =>
//                                                                 startRangeSelection(
//                                                                     realIdx,
//                                                                     cIdx
//                                                                 )
//                                                             }
//                                                             onMouseEnter={() =>
//                                                                 updateRangeSelection(
//                                                                     realIdx,
//                                                                     cIdx
//                                                                 )
//                                                             }
//                                                             onClick={() => {

//                                                                 setRangeSelection(null)

//                                                                 setSelection({
//                                                                     type: "cell",
//                                                                     r: realIdx,
//                                                                     c: cIdx
//                                                                 })
//                                                             }}
//                                                         >

//                                                             {row[cIdx]}

//                                                         </td>

//                                                     )
//                                                 })
//                                             }

//                                         </tr>
//                                     )
//                                 })
//                             }

//                         </tbody>

//                     </table>

//                 </div>

//             </div>

//             <div className="sheet-footer">

//                 {
//                     workbook?.SheetNames.map(name => (

//                         <div
//                             key={name}
//                             className={`tab ${
//                                 activeSheet === name
//                                     ? "active"
//                                     : ""
//                             }`}
//                             onClick={() =>
//                                 setActiveSheet(name)
//                             }
//                         >

//                             {name}

//                         </div>

//                     ))
//                 }

//             </div>

//         </div>
//     )
// }

// export default ExcelViewer






// import { useEffect, useRef, useState } from "react";
// import * as XLSX from "xlsx";


// const ROW_HEIGHT = 28
// const DEFAULT_COL_WIDTH = 120
// const BUFFER = 20

// const colCache = {}

// const getColumnName = (n) => {
//     if (colCache[n]) return colCache[n]

//     let name = ""
//     let num = n

//     while (num >= 0) {
//         name = String.fromCharCode((num % 26) + 65) + name
//         num = Math.floor(num / 26) - 1
//     }

//     colCache[n] = name
//     return name
// }

// function ExcelViewer({ file }) {

//     const BASE_URL = import.meta.env.VITE_API_URL
//     const fileUrl = `${BASE_URL}/files${file.storagePath}`

//     const [workbook, setWorkbook] = useState(null)
//     const [activeSheet, setActiveSheet] = useState("")
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(null)

//     const [scrollTop, setScrollTop] = useState(0)
//     const [viewportHeight, setViewportHeight] = useState(600)

//     const [sheetData, setSheetData] = useState([])
//     const [maxCols, setMaxCols] = useState(26)

//     const [selection, setSelection] = useState({
//         type: "cell",
//         r: -1,
//         c: -1
//     })

//     // drag selection
//     const [rangeSelection, setRangeSelection] = useState(null)
//     const [isDragging, setIsDragging] = useState(false)

//     const [colWidths, setColWidths] = useState({})
//     const resizingCol = useRef(null)

//     const viewportRef = useRef(null)
//     const sheetCache = useRef({})

//     // load workbook
//     useEffect(() => {

//         const loadExcel = async () => {
//             try {

//                 setLoading(true)

//                 const res = await fetch(fileUrl)
//                 const buffer = await res.arrayBuffer()

//                 const wb = XLSX.read(buffer, {
//                     type: "array"
//                 })

//                 setWorkbook(wb)
//                 setActiveSheet(wb.SheetNames[0])

//             } catch (err) {

//                 console.error(err)
//                 setError("Failed to open spreadsheet.")

//             } finally {
//                 setLoading(false)
//             }
//         }

//         loadExcel()

//     }, [fileUrl])

//     // viewport height
//     useEffect(() => {

//         const updateHeight = () => {
//             if (viewportRef.current) {
//                 setViewportHeight(
//                     viewportRef.current.offsetHeight
//                 )
//             }
//         }

//         updateHeight()

//         window.addEventListener("resize", updateHeight)

//         return () => {
//             window.removeEventListener("resize", updateHeight)
//         }

//     }, [])

//     // load sheet
//     useEffect(() => {

//         if (!workbook || !activeSheet) return

//         if (sheetCache.current[activeSheet]) {

//             const cached = sheetCache.current[activeSheet]

//             setSheetData(cached.data)
//             setMaxCols(cached.cols)

//         } else {

//             const ws = workbook.Sheets[activeSheet]

//             const range = XLSX.utils.decode_range(
//                 ws["!ref"] || "A1"
//             )

//             const allData = XLSX.utils.sheet_to_json(ws, {
//                 header: 1,
//                 defval: ""
//             })

//             const cols = range.e.c + 1

//             sheetCache.current[activeSheet] = {
//                 data: allData,
//                 cols
//             }

//             setSheetData(allData)
//             setMaxCols(cols)
//         }

//         setScrollTop(0)

//         if (viewportRef.current) {
//             viewportRef.current.scrollTop = 0
//         }

//         setSelection({
//             type: "cell",
//             r: -1,
//             c: -1
//         })

//         setRangeSelection(null)

//     }, [workbook, activeSheet])

//     // copy selected data
//     useEffect(() => {

//         const handleCopy = (e) => {

//             if (!e.ctrlKey && !e.metaKey) return
//             if (e.key !== "c") return

//             let text = ""

//             // drag selected range
//             if (rangeSelection) {

//                 const minRow = Math.min(
//                     rangeSelection.startRow,
//                     rangeSelection.endRow
//                 )

//                 const maxRow = Math.max(
//                     rangeSelection.startRow,
//                     rangeSelection.endRow
//                 )

//                 const minCol = Math.min(
//                     rangeSelection.startCol,
//                     rangeSelection.endCol
//                 )

//                 const maxCol = Math.max(
//                     rangeSelection.startCol,
//                     rangeSelection.endCol
//                 )

//                 const rows = []

//                 for (let r = minRow; r <= maxRow; r++) {

//                     const cols = []

//                     for (let c = minCol; c <= maxCol; c++) {
//                         cols.push(
//                             sheetData[r]?.[c] ?? ""
//                         )
//                     }

//                     rows.push(cols.join("\t"))
//                 }

//                 text = rows.join("\n")
//             }

//             // single cell
//             else if (
//                 selection.type === "cell" &&
//                 selection.r !== -1
//             ) {

//                 text =
//                     sheetData[selection.r]?.[selection.c] ?? ""
//             }

//             // full column
//             else if (
//                 selection.type === "col" &&
//                 selection.c !== -1
//             ) {

//                 text = sheetData
//                     .map(row => row[selection.c] ?? "")
//                     .join("\n")
//             }

//             // full row
//             else if (
//                 selection.type === "row" &&
//                 selection.r !== -1
//             ) {

//                 text = (sheetData[selection.r] || [])
//                     .join("\t")
//             }

//             if (text !== "") {
//                 navigator.clipboard.writeText(text)
//             }
//         }

//         window.addEventListener("keydown", handleCopy)

//         return () => {
//             window.removeEventListener("keydown", handleCopy)
//         }

//     }, [selection, sheetData, rangeSelection])

//     // stop dragging globally
//     useEffect(() => {

//         window.addEventListener(
//             "mouseup",
//             stopRangeSelection
//         )

//         return () => {
//             window.removeEventListener(
//                 "mouseup",
//                 stopRangeSelection
//             )
//         }

//     }, [isDragging])

//     // virtualization
//     const startIndex = Math.max(
//         0,
//         Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
//     )

//     const endIndex = Math.min(
//         sheetData.length,
//         Math.floor(
//             (scrollTop + viewportHeight) / ROW_HEIGHT
//         ) + BUFFER
//     )

//     const visibleRows = sheetData.slice(
//         startIndex,
//         endIndex
//     )

//     const handleScroll = (e) => {
//         setScrollTop(e.target.scrollTop)
//     }

//     // drag selection
//     const startRangeSelection = (r, c) => {

//         setIsDragging(true)

//         setRangeSelection({
//             startRow: r,
//             startCol: c,
//             endRow: r,
//             endCol: c
//         })

//         setSelection({
//             type: "cell",
//             r,
//             c
//         })
//     }

//     const updateRangeSelection = (r, c) => {

//         if (!isDragging) return

//         setRangeSelection(prev => ({
//             ...prev,
//             endRow: r,
//             endCol: c
//         }))

//         // auto scroll while dragging
//         const viewport = viewportRef.current

//         if (!viewport) return

//         const rect = viewport.getBoundingClientRect()
//         const mouseY = window.event?.clientY || 0

//         if (mouseY > rect.bottom - 40) {
//             viewport.scrollTop += 20
//         }

//         if (mouseY < rect.top + 40) {
//             viewport.scrollTop -= 20
//         }
//     }

//     const stopRangeSelection = () => {
//         setIsDragging(false)
//     }

//     // resize
//     const startResizing = (e, index) => {

//         e.preventDefault()

//         resizingCol.current = {
//             index,
//             startMouseX: e.pageX,
//             startWidth:
//                 colWidths[index] || DEFAULT_COL_WIDTH
//         }

//         document.addEventListener(
//             "mousemove",
//             handleResizing
//         )

//         document.addEventListener(
//             "mouseup",
//             stopResizing
//         )

//         document.body.style.cursor = "col-resize"
//     }

//     const handleResizing = (e) => {

//         if (!resizingCol.current) return

//         const {
//             index,
//             startMouseX,
//             startWidth
//         } = resizingCol.current

//         setColWidths(prev => ({
//             ...prev,
//             [index]: Math.max(
//                 50,
//                 startWidth + (e.pageX - startMouseX)
//             )
//         }))
//     }

//     const stopResizing = () => {

//         resizingCol.current = null

//         document.removeEventListener(
//             "mousemove",
//             handleResizing
//         )

//         document.removeEventListener(
//             "mouseup",
//             stopResizing
//         )

//         document.body.style.cursor = "default"
//     }

//     if (loading) {
//         return (
//             <div className="excel-loader">
//               <div className="cma-messages-are-loader-wrapper">
//                     <span className="loader"></span>
//                 </div>
//             </div>
//         )
//     }

//     if (error) {
//         return (
//             <div className="excel-error">
//                 {error}
//             </div>
//         )
//     }

//     return (
//         <div className="excel-preview">

//             <div className="excel-header-bar">

//                 <div className="cell-address">
//                     {
//                         selection.r !== -1
//                             ? `${getColumnName(selection.c)}${selection.r + 1}`
//                             : ""
//                     }
//                 </div>

//                 <div className="formula-bar">
//                     {
//                         selection.r !== -1 &&
//                         sheetData[selection.r]
//                             ? sheetData[selection.r][selection.c]
//                             : ""
//                     }
//                 </div>

//             </div>

//             <div
//                 className="grid-viewport"
//                 ref={viewportRef}
//                 onScroll={handleScroll}
//             >

//                 <div
//                     style={{
//                         height: sheetData.length * ROW_HEIGHT,
//                         width: Array.from({
//                             length: maxCols
//                         }).reduce(
//                             (acc, _, i) =>
//                                 acc + (
//                                     colWidths[i] ||
//                                     DEFAULT_COL_WIDTH
//                                 ),
//                             50
//                         ),
//                         position: "relative"
//                     }}
//                 >

//                     <table
//                         className="grid-table"
//                         style={{
//                             position: "absolute",
//                             top: startIndex * ROW_HEIGHT,
//                             left: 0
//                         }}
//                     >

//                         <colgroup>

//                             <col style={{ width: 50 }} />

//                             {
//                                 Array.from({
//                                     length: maxCols
//                                 }).map((_, i) => (
//                                     <col
//                                         key={i}
//                                         style={{
//                                             width:
//                                                 colWidths[i] ||
//                                                 DEFAULT_COL_WIDTH
//                                         }}
//                                     />
//                                 ))
//                             }

//                         </colgroup>

//                         <thead>

//                             <tr style={{ height: 25 }}>

//                                 <th className="header-cell corner"></th>

//                                 {
//                                     Array.from({
//                                         length: maxCols
//                                     }).map((_, i) => (

//                                         <th
//                                             key={i}
//                                             className={`header-cell col-header ${
//                                                 selection.type === "col" &&
//                                                 selection.c === i
//                                                     ? "active-header"
//                                                     : ""
//                                             }`}
//                                             onClick={() => {
//                                                 setRangeSelection(null)

//                                                 setSelection({
//                                                     type: "col",
//                                                     c: i,
//                                                     r: -1
//                                                 })
//                                             }}
//                                         >

//                                             {getColumnName(i)}

//                                             <div
//                                                 className="resizer"
//                                                 onMouseDown={(e) =>
//                                                     startResizing(e, i)
//                                                 }
//                                                 onClick={(e) =>
//                                                     e.stopPropagation()
//                                                 }
//                                             />

//                                         </th>

//                                     ))
//                                 }

//                             </tr>

//                         </thead>

//                         <tbody>

//                             {
//                                 visibleRows.map((row, i) => {

//                                     const realIdx =
//                                         startIndex + i

//                                     const isRowActive =
//                                         selection.type === "row" &&
//                                         selection.r === realIdx

//                                     return (

//                                         <tr
//                                             key={realIdx}
//                                             className="grid-row"
//                                         >

//                                             <th
//                                                 className={`header-cell row-header ${
//                                                     isRowActive
//                                                         ? "active-header"
//                                                         : ""
//                                                 }`}
//                                                 onClick={() => {

//                                                     setRangeSelection(null)

//                                                     setSelection({
//                                                         type: "row",
//                                                         r: realIdx,
//                                                         c: -1
//                                                     })
//                                                 }}
//                                             >

//                                                 {realIdx + 1}

//                                             </th>

//                                             {
//                                                 Array.from({
//                                                     length: maxCols
//                                                 }).map((_, cIdx) => {

//                                                     const isSelected =
//                                                         (
//                                                             selection.type === "cell" &&
//                                                             selection.r === realIdx &&
//                                                             selection.c === cIdx
//                                                         ) ||

//                                                         (
//                                                             selection.type === "col" &&
//                                                             selection.c === cIdx
//                                                         ) ||

//                                                         (
//                                                             selection.type === "row" &&
//                                                             selection.r === realIdx
//                                                         )

//                                                     const isInRange =
//                                                         rangeSelection &&

//                                                         realIdx >= Math.min(
//                                                             rangeSelection.startRow,
//                                                             rangeSelection.endRow
//                                                         ) &&

//                                                         realIdx <= Math.max(
//                                                             rangeSelection.startRow,
//                                                             rangeSelection.endRow
//                                                         ) &&

//                                                         cIdx >= Math.min(
//                                                             rangeSelection.startCol,
//                                                             rangeSelection.endCol
//                                                         ) &&

//                                                         cIdx <= Math.max(
//                                                             rangeSelection.startCol,
//                                                             rangeSelection.endCol
//                                                         )

//                                                     return (

//                                                         <td
//                                                             key={cIdx}
//                                                             className={`grid-cell ${
//                                                                 isSelected
//                                                                     ? "selected-cell"
//                                                                     : ""
//                                                             } ${
//                                                                 isInRange
//                                                                     ? "highlighted-range"
//                                                                     : ""
//                                                             }`}
//                                                             onMouseDown={() =>
//                                                                 startRangeSelection(
//                                                                     realIdx,
//                                                                     cIdx
//                                                                 )
//                                                             }
//                                                             onMouseEnter={() =>
//                                                                 updateRangeSelection(
//                                                                     realIdx,
//                                                                     cIdx
//                                                                 )
//                                                             }
//                                                             onClick={() => {

//                                                                 setRangeSelection(null)

//                                                                 setSelection({
//                                                                     type: "cell",
//                                                                     r: realIdx,
//                                                                     c: cIdx
//                                                                 })
//                                                             }}
//                                                         >

//                                                             {row[cIdx]}

//                                                         </td>

//                                                     )
//                                                 })
//                                             }

//                                         </tr>
//                                     )
//                                 })
//                             }

//                         </tbody>

//                     </table>

//                 </div>

//             </div>

//             <div className="sheet-footer">

//                 {
//                     workbook?.SheetNames.map(name => (

//                         <div
//                             key={name}
//                             className={`tab ${
//                                 activeSheet === name
//                                     ? "active"
//                                     : ""
//                             }`}
//                             onClick={() =>
//                                 setActiveSheet(name)
//                             }
//                         >

//                             {name}

//                         </div>

//                     ))
//                 }

//             </div>

//         </div>
//     )
// }

// export default ExcelViewer




// import { useEffect, useRef, useState } from "react";
// import * as XLSX from "xlsx";

// const ROW_HEIGHT = 28;
// const DEFAULT_COL_WIDTH = 120;
// const BUFFER = 20;

// const colCache = {};

// const getColumnName = (n) => {
//     if (colCache[n]) return colCache[n];
//     let name = "";
//     let num = n;
//     while (num >= 0) {
//         name = String.fromCharCode((num % 26) + 65) + name;
//         num = Math.floor(num / 26) - 1;
//     }
//     colCache[n] = name;
//     return name;
// };

// function ExcelViewer({ file }) {


//       console.log("REACHED EXCEL VIEWER", file)

//     const BASE_URL = import.meta.env.VITE_API_URL;
//     const fileUrl = `${BASE_URL}/files${file.storagePath}`;

//     const fileSizeMB = file.size ? file.size / (1024 * 1024) : null;
//     const tooBig = fileSizeMB && fileSizeMB > 10;

//     const [workbook, setWorkbook] = useState(null);
//     const [activeSheet, setActiveSheet] = useState("");
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     const [scrollTop, setScrollTop] = useState(0);
//     const [viewportHeight, setViewportHeight] = useState(600);

//     const [sheetData, setSheetData] = useState([]);
//     const [maxCols, setMaxCols] = useState(26);

//     const [selection, setSelection] = useState({ type: "cell", r: -1, c: -1 });

//     const [rangeSelection, setRangeSelection] = useState(null);
//     const [isDragging, setIsDragging] = useState(false);

//     const [colWidths, setColWidths] = useState({});
//     const resizingCol = useRef(null);

//     const viewportRef = useRef(null);
//     const sheetCache = useRef({});

//     // load workbook
//     useEffect(() => {
//         if (tooBig) return;

//         const loadExcel = async () => {
//             try {
//                 setLoading(true);
//                 const res = await fetch(fileUrl);
//                 const buffer = await res.arrayBuffer();
//                 const wb = XLSX.read(buffer, { type: "array" });
//                 setWorkbook(wb);
//                 setActiveSheet(wb.SheetNames[0]);
//             } catch (err) {
//                 console.error(err);
//                 setError("Failed to open spreadsheet.");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         loadExcel();
//     }, [fileUrl]);

//     // viewport height
//     useEffect(() => {
//         const updateHeight = () => {
//             if (viewportRef.current) {
//                 setViewportHeight(viewportRef.current.offsetHeight);
//             }
//         };
//         updateHeight();
//         window.addEventListener("resize", updateHeight);
//         return () => window.removeEventListener("resize", updateHeight);
//     }, []);

//     // load sheet
//     useEffect(() => {
//         if (!workbook || !activeSheet) return;

//         if (sheetCache.current[activeSheet]) {
//             const cached = sheetCache.current[activeSheet];
//             setSheetData(cached.data);
//             setMaxCols(cached.cols);
//         } else {
//             const ws = workbook.Sheets[activeSheet];
//             const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
//             const allData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
//             const cols = range.e.c + 1;
//             sheetCache.current[activeSheet] = { data: allData, cols };
//             setSheetData(allData);
//             setMaxCols(cols);
//         }

//         setScrollTop(0);
//         if (viewportRef.current) viewportRef.current.scrollTop = 0;
//         setSelection({ type: "cell", r: -1, c: -1 });
//         setRangeSelection(null);
//     }, [workbook, activeSheet]);

//     // copy
//     useEffect(() => {
//         const handleCopy = (e) => {
//             if (!e.ctrlKey && !e.metaKey) return;
//             if (e.key !== "c") return;

//             let text = "";

//             if (rangeSelection) {
//                 const minRow = Math.min(rangeSelection.startRow, rangeSelection.endRow);
//                 const maxRow = Math.max(rangeSelection.startRow, rangeSelection.endRow);
//                 const minCol = Math.min(rangeSelection.startCol, rangeSelection.endCol);
//                 const maxCol = Math.max(rangeSelection.startCol, rangeSelection.endCol);
//                 const rows = [];
//                 for (let r = minRow; r <= maxRow; r++) {
//                     const cols = [];
//                     for (let c = minCol; c <= maxCol; c++) {
//                         cols.push(sheetData[r]?.[c] ?? "");
//                     }
//                     rows.push(cols.join("\t"));
//                 }
//                 text = rows.join("\n");
//             } else if (selection.type === "cell" && selection.r !== -1) {
//                 text = sheetData[selection.r]?.[selection.c] ?? "";
//             } else if (selection.type === "col" && selection.c !== -1) {
//                 text = sheetData.map(row => row[selection.c] ?? "").join("\n");
//             } else if (selection.type === "row" && selection.r !== -1) {
//                 text = (sheetData[selection.r] || []).join("\t");
//             }

//             if (text !== "") navigator.clipboard.writeText(text);
//         };

//         window.addEventListener("keydown", handleCopy);
//         return () => window.removeEventListener("keydown", handleCopy);
//     }, [selection, sheetData, rangeSelection]);

//     // stop dragging globally
//     useEffect(() => {
//         window.addEventListener("mouseup", stopRangeSelection);
//         return () => window.removeEventListener("mouseup", stopRangeSelection);
//     }, [isDragging]);

//     const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
//     const endIndex = Math.min(
//         sheetData.length,
//         Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER
//     );
//     const visibleRows = sheetData.slice(startIndex, endIndex);

//     const handleScroll = (e) => setScrollTop(e.target.scrollTop);

//     const startRangeSelection = (r, c) => {
//         setIsDragging(true);
//         setRangeSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
//         setSelection({ type: "cell", r, c });
//     };

//     const updateRangeSelection = (r, c) => {
//         if (!isDragging) return;
//         setRangeSelection(prev => ({ ...prev, endRow: r, endCol: c }));
//         const viewport = viewportRef.current;
//         if (!viewport) return;
//         const rect = viewport.getBoundingClientRect();
//         const mouseY = window.event?.clientY || 0;
//         if (mouseY > rect.bottom - 40) viewport.scrollTop += 20;
//         if (mouseY < rect.top + 40) viewport.scrollTop -= 20;
//     };

//     const stopRangeSelection = () => setIsDragging(false);

//     const startResizing = (e, index) => {
//         e.preventDefault();
//         resizingCol.current = {
//             index,
//             startMouseX: e.pageX,
//             startWidth: colWidths[index] || DEFAULT_COL_WIDTH
//         };
//         document.addEventListener("mousemove", handleResizing);
//         document.addEventListener("mouseup", stopResizing);
//         document.body.style.cursor = "col-resize";
//     };

//     const handleResizing = (e) => {
//         if (!resizingCol.current) return;
//         const { index, startMouseX, startWidth } = resizingCol.current;
//         setColWidths(prev => ({
//             ...prev,
//             [index]: Math.max(50, startWidth + (e.pageX - startMouseX))
//         }));
//     };

//     const stopResizing = () => {
//         resizingCol.current = null;
//         document.removeEventListener("mousemove", handleResizing);
//         document.removeEventListener("mouseup", stopResizing);
//         document.body.style.cursor = "default";
//     };

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
//                 {fileSizeMB ? `This file is ${fileSizeMB.toFixed(1)} MB. ` : ""}
//                 Files larger than 10 MB cannot be previewed.
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

//     if (loading) return (
//         <div className="excel-loader">
//             <div className="cma-messages-are-loader-wrapper">
//                 <span className="loader"></span>
//             </div>
//         </div>
//     );

//     if (error) return (
//         <div className="excel-error">{error}</div>
//     );

//     return (
//         <div className="excel-preview">

//             <div className="excel-header-bar">
//                 <div className="cell-address">
//                     {selection.r !== -1 ? `${getColumnName(selection.c)}${selection.r + 1}` : ""}
//                 </div>
//                 <div className="formula-bar">
//                     {selection.r !== -1 && sheetData[selection.r]
//                         ? sheetData[selection.r][selection.c]
//                         : ""}
//                 </div>
//             </div>

//             <div
//                 className="grid-viewport"
//                 ref={viewportRef}
//                 onScroll={handleScroll}
//             >
//                 <div
//                     style={{
//                         height: sheetData.length * ROW_HEIGHT,
//                         width: Array.from({ length: maxCols }).reduce(
//                             (acc, _, i) => acc + (colWidths[i] || DEFAULT_COL_WIDTH),
//                             50
//                         ),
//                         position: "relative"
//                     }}
//                 >
//                     <table
//                         className="grid-table"
//                         style={{
//                             position: "absolute",
//                             top: startIndex * ROW_HEIGHT,
//                             left: 0
//                         }}
//                     >
//                         <colgroup>
//                             <col style={{ width: 50 }} />
//                             {Array.from({ length: maxCols }).map((_, i) => (
//                                 <col key={i} style={{ width: colWidths[i] || DEFAULT_COL_WIDTH }} />
//                             ))}
//                         </colgroup>

//                         <thead>
//                             <tr style={{ height: 25 }}>
//                                 <th className="header-cell corner"></th>
//                                 {Array.from({ length: maxCols }).map((_, i) => (
//                                     <th
//                                         key={i}
//                                         className={`header-cell col-header ${
//                                             selection.type === "col" && selection.c === i ? "active-header" : ""
//                                         }`}
//                                         onClick={() => {
//                                             setRangeSelection(null);
//                                             setSelection({ type: "col", c: i, r: -1 });
//                                         }}
//                                     >
//                                         {getColumnName(i)}
//                                         <div
//                                             className="resizer"
//                                             onMouseDown={(e) => startResizing(e, i)}
//                                             onClick={(e) => e.stopPropagation()}
//                                         />
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>

//                         <tbody>
//                             {visibleRows.map((row, i) => {
//                                 const realIdx = startIndex + i;
//                                 const isRowActive = selection.type === "row" && selection.r === realIdx;

//                                 return (
//                                     <tr key={realIdx} className="grid-row">
//                                         <th
//                                             className={`header-cell row-header ${isRowActive ? "active-header" : ""}`}
//                                             onClick={() => {
//                                                 setRangeSelection(null);
//                                                 setSelection({ type: "row", r: realIdx, c: -1 });
//                                             }}
//                                         >
//                                             {realIdx + 1}
//                                         </th>

//                                         {Array.from({ length: maxCols }).map((_, cIdx) => {
//                                             const isSelected =
//                                                 (selection.type === "cell" && selection.r === realIdx && selection.c === cIdx) ||
//                                                 (selection.type === "col" && selection.c === cIdx) ||
//                                                 (selection.type === "row" && selection.r === realIdx);

//                                             const isInRange =
//                                                 rangeSelection &&
//                                                 realIdx >= Math.min(rangeSelection.startRow, rangeSelection.endRow) &&
//                                                 realIdx <= Math.max(rangeSelection.startRow, rangeSelection.endRow) &&
//                                                 cIdx >= Math.min(rangeSelection.startCol, rangeSelection.endCol) &&
//                                                 cIdx <= Math.max(rangeSelection.startCol, rangeSelection.endCol);

//                                             return (
//                                                 <td
//                                                     key={cIdx}
//                                                     className={`grid-cell ${isSelected ? "selected-cell" : ""} ${isInRange ? "highlighted-range" : ""}`}
//                                                     onMouseDown={() => startRangeSelection(realIdx, cIdx)}
//                                                     onMouseEnter={() => updateRangeSelection(realIdx, cIdx)}
//                                                     onClick={() => {
//                                                         setRangeSelection(null);
//                                                         setSelection({ type: "cell", r: realIdx, c: cIdx });
//                                                     }}
//                                                 >
//                                                     {row[cIdx]}
//                                                 </td>
//                                             );
//                                         })}
//                                     </tr>
//                                 );
//                             })}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>

//             <div className="sheet-footer">
//                 {workbook?.SheetNames.map(name => (
//                     <div
//                         key={name}
//                         className={`tab ${activeSheet === name ? "active" : ""}`}
//                         onClick={() => setActiveSheet(name)}
//                     >
//                         {name}
//                     </div>
//                 ))}
//             </div>

//         </div>
//     );
// }

// export default ExcelViewer;



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

function ExcelViewer({ file }) {

    const { downloadFile } = useDownload();
    const fileUrl = `/files${file.storagePath}`;

    const [tooBig, setTooBig] = useState(false);
    const [tooBigMB, setTooBigMB] = useState(null);
    const [workbook, setWorkbook] = useState(null);
    const [activeSheet, setActiveSheet] = useState("");
    const [loading, setLoading] = useState(true);
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
                setLoading(true);

                const res = await fetch(fileUrl);

                // Content-Length se size check
                const contentLength = res.headers.get("Content-Length");
                const sizeMB = contentLength
                    ? parseInt(contentLength) / (1024 * 1024)
                    : null;

                if (sizeMB && sizeMB > 10) {
                    setTooBig(true);
                    setTooBigMB(sizeMB);
                    setLoading(false);
                    return;
                }

                const buffer = await res.arrayBuffer();

                // agar Content-Length nahi tha to buffer size se check
                const bufferSizeMB = buffer.byteLength / (1024 * 1024);
                if (bufferSizeMB > 20) {
                    setTooBig(true);
                    setTooBigMB(bufferSizeMB);
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

        loadExcel();
    }, [fileUrl]);

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
            const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
            const allData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            const cols = range.e.c + 1;
            sheetCache.current[activeSheet] = { data: allData, cols };
            setSheetData(allData);
            setMaxCols(cols);
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

    if (loading) return (
        <div className="excel-loader">
            <div className="cma-messages-are-loader-wrapper">
                <span className="loader"></span>
            </div>
        </div>
    );

    if (tooBig) return (
        <div className="preview-toobig">
            <div className="txt-toobig-icon">
                <InteractiveIcon
                    defaultIcon={excelFileIcon}
                    width={36}
                    height={42}
                    alt=""
                />
            </div>
            <p className="preview-toobig-title m-0">File too large to preview</p>
            <p className="mute-text">
                {tooBigMB ? `This file is ${tooBigMB.toFixed(1)} MB. ` : ""}
                Files larger than 10 MB cannot be previewed.
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

    if (error) return (
        <div className="excel-error">{error}</div>
    );

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
                                        className={`header-cell col-header ${
                                            selection.type === "col" && selection.c === i ? "active-header" : ""
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