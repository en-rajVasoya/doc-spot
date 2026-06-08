import { useState } from "react";

/* ========================= */
/* 🔵 Progress Circle */
/* ========================= */
function ProgressCircle({ percent = 0 }) {
    const radius = 11;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
            <circle stroke="#e0e0e0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
            <circle
                stroke="#2563eb"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset, transition: "stroke-dashoffset 0.3s ease" }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
    );
}

/* ========================= */
/* Icons (inline SVG) */
/* ========================= */
const FileIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
    </svg>
);

const FolderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
);

const DoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const ErrorIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

const RetryIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
);

const CloseIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const WarningIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);

/* ========================= */
/* 📄 File Row */
/* ========================= */
function FileRow({ file, onClose, onRetry }) {
    const { name, status, progress = 0 } = file;

    const isPreparing = status === "preparing";
    const isUploading = status === "uploading";
    const isDone = status === "done";
    const isError = status === "error";

    return (
        <div style={styles.row}>
            {/* Left */}
            <div style={styles.rowLeft}>
                <div style={styles.iconWrap}><FileIcon /></div>
                <div style={styles.textWrap}>
                    <div style={styles.name}>{name}</div>
                    {isPreparing && <div style={styles.sub}>Preparing...</div>}
                    {isUploading && <div style={styles.sub}>{progress}%</div>}
                    {isError && <div style={{ ...styles.sub, color: "#dc2626" }}>Upload failed</div>}
                    {isDone && <div style={{ ...styles.sub, color: "#16a34a" }}>Done</div>}
                </div>
            </div>

            {/* Right */}
            <div style={styles.rowRight}>
                {isPreparing && <ProgressCircle percent={0} />}
                {isUploading && <ProgressCircle percent={progress} />}
                {isDone && <span style={styles.iconBtn}><DoneIcon /></span>}
                {isError && (
                    <>
                        <span style={styles.iconBtn}><ErrorIcon /></span>
                        <button style={styles.btn} onClick={() => onRetry(file)} title="Retry">
                            <RetryIcon />
                        </button>
                    </>
                )}
                <button style={styles.btn} onClick={() => onClose(file)} title="Close">
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
}

/* ========================= */
/* 📁 Folder Row */
/* ========================= */
function FolderRow({ session, onClose, onRetryFailed }) {
    const { name, total, done, failed, prepared, status } = session;

    const isPreparing = status === "preparing";
    const isUploading = status === "uploading";
    const isDone = status === "done";
    const isPartialFail = status === "partial";
    const isAllFailed = status === "allFailed";

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const prepPercent = total > 0 ? Math.round((prepared / total) * 100) : 0;

    let subLabel = null;
    if (isPreparing) subLabel = <span style={styles.sub}>Preparing {prepared} of {total}</span>;
    else if (isUploading) subLabel = <span style={styles.sub}>{done} of {total} uploading</span>;
    else if (isDone) subLabel = <span style={{ ...styles.sub, color: "#16a34a" }}>{total} files done</span>;
    else if (isPartialFail) subLabel = <span style={{ ...styles.sub, color: "#d97706" }}>{done} done · {failed} failed of {total}</span>;
    else if (isAllFailed) subLabel = <span style={{ ...styles.sub, color: "#dc2626" }}>All {total} files failed</span>;

    return (
        <div style={styles.row}>
            {/* Left */}
            <div style={styles.rowLeft}>
                <div style={styles.iconWrap}><FolderIcon /></div>
                <div style={styles.textWrap}>
                    <div style={styles.name}>{name}</div>
                    {subLabel}
                </div>
            </div>

            {/* Right */}
            <div style={styles.rowRight}>
                {isPreparing && <ProgressCircle percent={prepPercent} />}
                {isUploading && <ProgressCircle percent={percent} />}
                {isDone && <span style={styles.iconBtn}><DoneIcon /></span>}
                {isPartialFail && (
                    <>
                        <span style={styles.iconBtn}><WarningIcon /></span>
                        <button style={{ ...styles.btn, color: "#2563eb", fontSize: "11px", fontWeight: 600 }} onClick={() => onRetryFailed(session)}>
                            Retry failed
                        </button>
                    </>
                )}
                {isAllFailed && (
                    <>
                        <span style={styles.iconBtn}><ErrorIcon /></span>
                        <button style={{ ...styles.btn, color: "#2563eb", fontSize: "11px", fontWeight: 600 }} onClick={() => onRetryFailed(session)}>
                            Retry all
                        </button>
                    </>
                )}
                <button style={styles.btn} onClick={() => onClose(session)} title="Close">
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
}

/* ========================= */
/* 🗂 Upload Panel */
/* ========================= */
function Test() {
    // Demo sessions — newest on top
    const [sessions, setSessions] = useState([
        {
            id: "s1",
            type: "folder",
            name: "Project Assets",
            total: 10,
            done: 7,
            failed: 2,
            prepared: 10,
            status: "partial", // preparing | uploading | done | partial | allFailed
        },
        {
            id: "s2",
            type: "file",
            name: "design-brief.pdf",
            status: "uploading",
            progress: 63,
        },
        {
            id: "s3",
            type: "file",
            name: "logo-final.png",
            status: "done",
            progress: 100,
        },
        {
            id: "s4",
            type: "file",
            name: "video-export.mp4",
            status: "error",
            progress: 0,
        },
        {
            id: "s5",
            type: "folder",
            name: "Marketing 2024",
            total: 24,
            done: 0,
            failed: 0,
            prepared: 14,
            status: "preparing",
        },
        {
            id: "s6",
            type: "folder",
            name: "Client Photos",
            total: 18,
            done: 18,
            failed: 0,
            prepared: 18,
            status: "done",
        },
    ]);

    const [isOpen, setIsOpen] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    const removeSession = (item) => {
        setSessions(prev => prev.filter(s => s.id !== item.id));
    };

    const retryFile = (file) => {
        setSessions(prev => prev.map(s =>
            s.id === file.id ? { ...s, status: "uploading", progress: 0 } : s
        ));
    };

    const retryFailed = (session) => {
        setSessions(prev => prev.map(s =>
            s.id === session.id ? { ...s, status: "uploading", failed: 0, done: s.done } : s
        ));
    };

    if (!isOpen) return null;

    const doneCount = sessions.filter(s => s.status === "done").length;
    const totalCount = sessions.length;

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.headerTitle}>Uploads</span>
                    <span style={styles.headerBadge}>{doneCount}/{totalCount}</span>
                </div>
                <div style={styles.rowRight}>
                    <button style={styles.btn} onClick={() => setIsMinimized(p => !p)} title={isMinimized ? "Expand" : "Minimize"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
                            {isMinimized
                                ? <polyline points="18 15 12 9 6 15" />
                                : <polyline points="6 9 12 15 18 9" />
                            }
                        </svg>
                    </button>
                    <button style={styles.btn} onClick={() => setIsOpen(false)} title="Close all">
                        <CloseIcon />
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <div style={styles.body}>
                    {sessions.length === 0 && (
                        <div style={styles.empty}>No uploads</div>
                    )}
                    {sessions.map(session =>
                        session.type === "folder"
                            ? <FolderRow key={session.id} session={session} onClose={removeSession} onRetryFailed={retryFailed} />
                            : <FileRow key={session.id} file={session} onClose={removeSession} onRetry={retryFile} />
                    )}
                </div>
            )}
        </div>
    );
}

export default Test;

/* ========================= */
/* Styles */
/* ========================= */
const styles = {
    panel: {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "340px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: "1px solid #f3f4f6",
        background: "#fafafa",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    headerTitle: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#111827",
        letterSpacing: "-0.01em",
    },
    headerBadge: {
        fontSize: "11px",
        fontWeight: 600,
        color: "#6b7280",
        background: "#f3f4f6",
        borderRadius: "99px",
        padding: "1px 7px",
    },
    body: {
        maxHeight: "320px",
        overflowY: "auto",
    },
    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderBottom: "1px solid #f9fafb",
        gap: "8px",
    },
    rowLeft: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
        flex: 1,
    },
    iconWrap: {
        flexShrink: 0,
        width: "32px",
        height: "32px",
        background: "#f3f4f6",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    textWrap: {
        minWidth: 0,
    },
    name: {
        fontSize: "12.5px",
        fontWeight: 500,
        color: "#111827",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "160px",
    },
    sub: {
        fontSize: "11px",
        color: "#9ca3af",
        marginTop: "1px",
    },
    rowRight: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexShrink: 0,
    },
    iconBtn: {
        display: "flex",
        alignItems: "center",
    },
    btn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "3px",
        display: "flex",
        alignItems: "center",
        borderRadius: "4px",
        color: "#6b7280",
    },
    empty: {
        padding: "24px",
        textAlign: "center",
        fontSize: "12px",
        color: "#9ca3af",
    },
};