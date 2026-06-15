// import React, { useEffect, useState } from "react"
// import JSZip from "jszip"
// import InteractiveIcon from "../../layout/InteractiveIcon"
// import getFileType from "../../../utils/getFileType"
// import Breadcrumbs from "../Breadcrumbs"

// import listFolder1Icon from "@images/svgs/list/SF1.svg";
// import imgIcon from "@images/svgs/media/img-file.svg"
// import musicIcon from "@images/svgs/media/music-file.svg"
// import pdfIcon from "@images/svgs/media/pdf-file.svg"
// import videoIcon from "@images/svgs/media/video-file.svg"
// import zipIcon from "@images/svgs/media/zip-file.svg"
// import defaultFileIcon from "@images/svgs/file.svg"
// import noFilesFound from "@images/icon/no-files-found.svg"
// import downloadIcon from "@images/icon/download.svg"
// import { useDownload } from "../../../context/DownloadContext"

// const ZIP_PREVIEW_LIMIT = 50 * 1024 * 1024 // 50MB

// function ZipViewer({ file }) {
//     const { downloadFile } = useDownload()
//     const BASE_URL = import.meta.env.VITE_API_URL
//     const zipUrl = `${BASE_URL}/files${file.storagePath}`

//     const [fsMap, setFsMap] = useState({})
//     const [currentPath, setCurrentPath] = useState("")
//     const [trail, setTrail] = useState([])

//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(null)

//     //  here when user click on zip viewer this wull run here
//     useEffect(() => {
//         const loadZip = async () => {
//             try {
//                 if (file.fileSize > ZIP_PREVIEW_LIMIT) {
//                     setError("File is too large to preview.")
//                     setLoading(false)
//                     return
//                 }

//                 const res = await fetch(zipUrl)
//                 const blob = await res.blob()

//                 const zip = await JSZip.loadAsync(blob)

//                 // check total uncompressed size before processing — zip bomb protection
//                 let totalUncompressed = 0
//                 zip.forEach((relativePath, zipEntry) => {
//                     totalUncompressed += zipEntry._data?.uncompressedSize || 0
//                 })

//                 if (totalUncompressed > 200 * 1024 * 1024) {
//                     setError("ZIP contents are too large to preview.")
//                     setLoading(false)
//                     return
//                 }

//                 const map = { "": [] }

//                 zip.forEach((relativePath, zipEntry) => {
//                     const parts = relativePath.split('/').filter(Boolean)
//                     if (parts.length === 0) return

//                     let pathAccumulator = ""

//                     for (let i = 0; i < parts.length; i++) {
//                         const isLast = (i === parts.length - 1)
//                         const isDir = isLast ? zipEntry.dir : true
//                         const name = parts[i]
//                         const nextPath = pathAccumulator + name + (isDir ? "/" : "")

//                         if (!map[pathAccumulator]) map[pathAccumulator] = []

//                         const exists = map[pathAccumulator].find(child => child.path === nextPath)
//                         if (!exists) {
//                             map[pathAccumulator].push({
//                                 name: name,
//                                 path: nextPath,
//                                 isDir: isDir,
//                                 size: isLast && !isDir && zipEntry._data ? zipEntry._data.uncompressedSize : 0
//                             })
//                         }
//                         pathAccumulator = nextPath
//                     }
//                 })

//                 Object.keys(map).forEach(key => {
//                     map[key].sort((a, b) => {
//                         if (a.isDir && !b.isDir) return -1;
//                         if (!a.isDir && b.isDir) return 1;
//                         return a.name.localeCompare(b.name);
//                     })
//                 })

//                 setFsMap(map)
//             } catch (err) {
//                 console.error(err)
//                 setError("Failed to read ZIP contents")
//             } finally {
//                 setLoading(false)
//             }
//         }

//         loadZip()
//     }, [file])

//     const getIcon = (entry) => {
//         if (entry.isDir) return listFolder1Icon
//         const type = getFileType(entry.name)
//         switch (type) {
//             case "image": return imgIcon
//             case "video": return videoIcon
//             case "audio": return musicIcon
//             case "pdf": return pdfIcon
//             case "zip": return zipIcon
//             default: return defaultFileIcon
//         }
//     }

//     const formatSize = (bytes) => {
//         if (!bytes) return ""
//         if (bytes < 1024) return bytes + " B"
//         if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
//         return (bytes / (1024 * 1024)).toFixed(1) + " MB"
//     }

//     const handleDoubleClick = (entry) => {
//         if (entry.isDir) {
//             setCurrentPath(entry.path)
//             setTrail(prev => [...prev, { id: entry.path, name: entry.name }])
//         }
//     }

//     const handleNavigate = (depth) => {
//         const newTrail = trail.slice(0, depth)
//         setTrail(newTrail)
//         setCurrentPath(newTrail.length ? newTrail[newTrail.length - 1].id : "")
//     }

//     const handleHomeClick = () => {
//         setTrail([])
//         setCurrentPath("")
//     }

//     //  download file
//     const handleDownload = () => {
//         downloadFile(file)
//     }

//     if (loading) {
//         return (
//             <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100" style={{ backgroundColor: "#ffffff", borderRadius: "12px", minHeight: "400px" }}>
//                 <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem", borderWidth: "0.25em" }} role="status"></div>
//                 <p style={{ color: "#5f6368", fontSize: "16px", fontWeight: "500" }}>Extracting archive...</p>
//             </div>
//         )
//     }

//     if (error) {
//         return (
//             <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100" style={{ backgroundColor: "#ffffff", borderRadius: "12px", minHeight: "400px" }}>
//                 <InteractiveIcon defaultIcon={noFilesFound} alt="Error" width={100} height={100} className="mb-4 opacity-50" />
//                 <h4 className="mb-2" style={{ color: "#202124", fontWeight: "600" }}>{error}</h4>
//                 <p className="mb-4" style={{ color: "#5f6368", fontSize: "15px" }}>The file might be too large or corrupted. You can still download it directly.</p>
//                 <button onClick={() => downloadFile(file)} className="btn btn-black btn-lg" style={{ borderRadius: "8px", padding: "10px 24px", fontWeight: "500" }}>
//                 Download File
//             </button>
//             </div>
//         )
//     }

//     const currentItems = fsMap[currentPath] || []

//     return (
//         <div className="d-flex flex-column" style={{
//             height: "80vh",
//             width: "80vw",
//             maxWidth: "1000px",
//             backgroundColor: "#ffffff",
//             borderRadius: "16px",
//             boxShadow: "0 12px 48px rgba(0,0,0,0.15)",
//             overflow: "hidden"
//         }}>
//             {/* Premium Header / Breadcrumbs */}
//             <div className="header pb-0 border-bottom bg-white px-4 d-flex justify-content-between align-items-center">
//                 <div className="header-view" style={{ flex: 1, overflow: "hidden" }}>
//                     <Breadcrumbs
//                         trail={trail}
//                         onNavigate={handleNavigate}
//                         onHomeClick={handleHomeClick}
//                         maxVisible={4}
//                         rootLabel="ZIP Root"
//                         actions={[]}
//                     />
//                 </div>

//                 {/* <a href={zipUrl} download className="btn d-flex align-items-center" style={{ 
//                     backgroundColor: "#f1f3f4", 
//                     color: "#202124", 
//                     borderRadius: "8px", 
//                     padding: "8px 16px", 
//                     fontWeight: "500",
//                     border: "none",
//                     transition: "background 0.2s"
//                 }}
//                 onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e8eaed"}
//                 onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f3f4"}
//                 >
//                     <InteractiveIcon defaultIcon={downloadIcon} width={18} height={18} className="me-2" />
//                     Download
//                 </a> */}
//             </div>

//             {/* Table Header */}
//             <div className="px-4 py-2 border-bottom d-flex align-items-center" style={{
//                 backgroundColor: "#f8f9fa",
//                 fontSize: "12px",
//                 fontWeight: "600",
//                 color: "#5f6368",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.8px"
//             }}>
//                 <div style={{ flex: 3, paddingLeft: "42px" }}>Name</div>
//                 <div style={{ flex: 1 }}>Size</div>
//                 <div style={{ flex: 1 }}>Type</div>
//             </div>

//             {/* Folder / File List */}
//             <div className="flex-grow-1 px-2 py-2" style={{ overflowY: "auto" }}>
//                 {currentItems.length === 0 ? (
//                     <div className="d-flex flex-column align-items-center justify-content-center h-100">
//                         <InteractiveIcon defaultIcon={noFilesFound} alt="No items" width={80} height={80} className="opacity-25 mb-3" />
//                         <p style={{ color: "#80868b", fontSize: "15px" }}>This folder is empty</p>
//                     </div>
//                 ) : (
//                     currentItems.map((entry, i) => (
//                         <div
//                             key={i}
//                             className="d-flex align-items-center px-3 py-2 cursor-pointer mb-1"
//                             style={{
//                                 borderRadius: "8px",
//                                 transition: "background 0.15s ease",
//                                 userSelect: "none"
//                             }}
//                             onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f1f3f4"}
//                             onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
//                             onDoubleClick={() => handleDoubleClick(entry)}
//                         >
//                             <div className="d-flex align-items-center overflow-hidden pe-3" style={{ flex: 3 }}>
//                                 <InteractiveIcon
//                                     defaultIcon={getIcon(entry)}
//                                     width={28}
//                                     height={28}
//                                     className="me-3 flex-shrink-0"
//                                 />
//                                 <span
//                                     className="text-truncate"
//                                     style={{
//                                         fontSize: "14px",
//                                         color: "#202124",
//                                         fontWeight: entry.isDir ? "500" : "400"
//                                     }}
//                                     title={entry.name}
//                                 >
//                                     {entry.name}
//                                 </span>
//                             </div>
//                             <div className="text-truncate pe-3" style={{ flex: 1, fontSize: "13px", color: "#5f6368" }}>
//                                 {entry.isDir ? "—" : formatSize(entry.size)}
//                             </div>
//                             <div className="text-truncate" style={{ flex: 1, fontSize: "13px", color: "#5f6368" }}>
//                                 {entry.isDir ? "Folder" : getFileType(entry.name).toUpperCase()}
//                             </div>
//                         </div>
//                     ))
//                 )}
//             </div>
//         </div>
//     )
// }

// export default ZipViewer










import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import InteractiveIcon from "../../layout/InteractiveIcon";
import getFileType from "../../../utils/getFileType";
import Breadcrumbs from "../Breadcrumbs";
import getFileIcon from "../../../utils/getFileIcon";
import getFolderIcon from "../../../utils/getFolderIconColor";
import noFilesFound from "@images/icon/no-files-found.svg";
import downloadIcon from "@images/icon/download.svg";
import excelFileIcon from "@images/svgs/media/zip-file.svg";
import { useDownload } from "../../../context/DownloadContext";




const ZIP_PREVIEW_LIMIT = 50 * 1024 * 1024 // 50MB
const loadZip = async (zipBlob, pathPrefix = "", mapRef = { "": [] }) => {
    const zip = await JSZip.loadAsync(zipBlob)
    zip.forEach((relativePath, zipEntry) => {
        const parts = relativePath.split('/').filter(Boolean)
        if (parts.length === 0) return
        let pathAccumulator = pathPrefix
        for (let i = 0; i < parts.length; i++) {
            const isLast = (i === parts.length - 1)
            const isDir = isLast ? zipEntry.dir : true
            const name = parts[i]
            const nextPath = pathAccumulator + name + (isDir ? "/" : "")
            if (!mapRef[pathAccumulator]) mapRef[pathAccumulator] = []
            const exists = mapRef[pathAccumulator].find(child => child.path === nextPath)
            if (!exists) {
                mapRef[pathAccumulator].push({
                    name,
                    path: nextPath,
                    isDir,
                    isNestedZip: isLast && !isDir && name.toLowerCase().endsWith(".zip"),
                    zipEntry: isLast && !isDir ? zipEntry : null,
                    size: isLast && !isDir && zipEntry._data ? zipEntry._data.uncompressedSize : 0
                })
            }
            pathAccumulator = nextPath
        }
    })
    const nestedZips = []
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith(".zip")) {
            nestedZips.push({ relativePath, zipEntry })
        }
    })
    for (const { relativePath, zipEntry } of nestedZips) {
        try {
            const nestedBlob = await zipEntry.async("blob")
            const nestedPrefix = pathPrefix + relativePath + "/"
            if (!mapRef[pathPrefix + relativePath]) {
                mapRef[pathPrefix + relativePath] = []
            }
            await loadZip(nestedBlob, nestedPrefix, mapRef)
        } catch (e) {
            console.warn("Could not open nested ZIP:", relativePath, e)
        }
    }
    return mapRef
}
function ZipViewer({ file }) {
    const { downloadFile } = useDownload()
    const zipUrl = `${file.storagePath}`
    const [fsMap, setFsMap] = useState({})
    const [currentPath, setCurrentPath] = useState("")
    const [trail, setTrail] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    useEffect(() => {
        const init = async () => {
            try {
                if (file.fileSize > ZIP_PREVIEW_LIMIT) {
                    setError("File is too large to preview.")
                    setLoading(false)
                    return
                }
                const res = await fetch(zipUrl)
                const blob = await res.blob()
                // zip bomb check
                const zip = await JSZip.loadAsync(blob)
                let totalUncompressed = 0
                zip.forEach((_, zipEntry) => {
                    totalUncompressed += zipEntry._data?.uncompressedSize || 0
                })
                if (totalUncompressed > 200 * 1024 * 1024) {
                    setError("ZIP contents are too large to preview.")
                    setLoading(false)
                    return
                }
                const map = await loadZip(blob)
                Object.keys(map).forEach(key => {
                    map[key].sort((a, b) => {
                        if (a.isDir && !b.isDir) return -1
                        if (!a.isDir && b.isDir) return 1
                        return a.name.localeCompare(b.name)
                    })
                })
                setFsMap(map)
            } catch (err) {
                console.error(err)
                setError("Failed to read ZIP contents")
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [file])
    const formatSize = (bytes) => {
        if (!bytes) return ""
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
    const handleDoubleClick = (entry) => {
        if (entry.isDir || entry.isNestedZip) {
            const targetPath = entry.isNestedZip ? entry.path + "/" : entry.path
            setCurrentPath(targetPath)
            setTrail(prev => [...prev, { id: targetPath, name: entry.name }])
        }
    }
    const handleNavigate = (depth) => {
        const newTrail = trail.slice(0, depth)
        setTrail(newTrail)
        setCurrentPath(newTrail.length ? newTrail[newTrail.length - 1].id : "")
    }
    const handleHomeClick = () => {
        setTrail([])
        setCurrentPath("")
    }
    if (loading) {
        return (
            <div className="excel-loader">
                <div className="cma-messages-are-loader-wrapper">
                    <span className="loader"></span>
                </div>
            </div>
        )
    }
    if (error) {
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
                <p className="preview-toobig-title m-0">File too large to preview</p>
                <p className="mute-text">{error}</p>
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
        )
    }
    const currentItems = fsMap[currentPath] || []
    return (
        <div className="zip-preview-wrapper">
            {/* Header / Breadcrumbs */}
            <div className="header">
                <div className="header-view">
                    <Breadcrumbs
                        trail={trail}
                        onNavigate={handleNavigate}
                        onHomeClick={handleHomeClick}
                        maxVisible={4}
                        rootLabel="ZIP Root"
                        actions={[]}
                    />
                </div>
            </div>
            {/* Folder / File List */}
            <div className="zip-preview-list">
                {currentItems.length === 0 ? (
                    <div className="zip-preview-empty">
                        <InteractiveIcon defaultIcon={noFilesFound} alt="No items" width={100} height={100} className="mb-3" />
                        <p className="mute-text">This folder is empty</p>
                    </div>
                ) : (
                    currentItems.map((entry, i) => (
                        <div
                            key={i}
                            className="zip-preview-row"
                            onDoubleClick={() => handleDoubleClick(entry)}
                        >
                            <div className="d-flex align-items-center zip-preview-row-name">
                                <InteractiveIcon
                                    defaultIcon={
                                        entry.isDir
                                            ? getFolderIcon("red", "list", false)
                                            : entry.isNestedZip
                                                ? excelFileIcon
                                                : getFileIcon(entry.name)
                                    }
                                    width={32}
                                    height={38}
                                    className="me-3 flex-shrink-0"
                                />
                                <span
                                    className={`text-truncate zip-preview-row-name-text ${entry.isDir ? "is-dir" : "is-file"}`}
                                    title={entry.name}
                                >
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-truncate zip-preview-row-size">
                                {entry.isDir ? "—" : formatSize(entry.size)}
                            </div>
                            <div className="text-truncate zip-preview-row-type">
                                {entry.isDir ? "Folder" : getFileType(entry.name).toUpperCase()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
export default ZipViewer