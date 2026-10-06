import { useState, useRef, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg";
import downloadIcon from "@images/icon/download.svg";
import useResponsive from "../../hooks/useResponsive";
import { useAdmin } from "../../context/AdminContext";

import { parseImportFile, runFileValidation } from "../../utils/importUserValidation";

function ImportUserModal({ onClose }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);
    const { isMobile } = useResponsive();
    const { importUsers, getUserInfo } = useAdmin()
    const [fileName, setFileName] = useState("No file chosen");

    //  for the user to import the file
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [headerError, setHeaderError] = useState("");

    const [existingUserIdSet, setExistingUserIdSet] = useState(new Set());
    const [existingEmailSet, setExistingEmailSet] = useState(new Set());


    //  this will get all user id and email when this model opens
    useEffect(() => {
        const fetchUserInfo = async () => {
            const users = await getUserInfo()
            const userIdSet = new Set()
            const emailSet = new Set()

            users.forEach((u) => {
                if (u.user_id) userIdSet.add(u.user_id.trim());
                if (u.email) emailSet.add(u.email.trim().toLowerCase());
            })

            setExistingUserIdSet(userIdSet);
            setExistingEmailSet(emailSet);
        }

        fetchUserInfo()
    }, [])

    // Helper to format bytes into readable KB/MB
    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            if (isMobile) {
                onClose();
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 400);
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = file.name.toLowerCase();
        if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            alert("Please select a valid CSV or Excel file (.csv, .xlsx, .xls)");
            return;
        }

        setSelectedFile(file)
        setHeaderError("");
        setImportResult(null)

        // Check if file size exceeds 10MB limit (10 * 1024 * 1024 bytes)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setHeaderError("File size exceeds 10MB limit. Please select a smaller file.");
            return;
        }

        setLoading(true)

        try {
            const parsed = await parseImportFile(file)

            //  run validation 
            const validation = runFileValidation(parsed, {
                existingUserIdSet,
                existingEmailSet
            })

            if (validation.headerError) {
                setHeaderError(validation.headerError);
            } else {
                setImportResult({
                    validRows: validation.validRows || [],
                    errorDetails: validation.errors || [],
                    errors: (validation.errors || []).length,
                    validCount: validation.validCount || 0,
                    totalCount: validation.totalCount || 0,
                });
            }

        } catch (error) {
            //  header mismatch error here
            const errorMessage = error.response?.data?.message
            if (errorMessage && errorMessage.includes("headers")) {
                setHeaderError(
                    "Header mismatch detected. The import file is missing or contains incorrect column names.\nExpected headers: user_id, Full Name, Email, Password."
                );
            } else {
                setHeaderError(errorMessage || "Failed to process CSV file.");
            }
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csvContent = "user_id,name,email,password\njohn_doe,John Doe,john@example.com,Password@123\njane_smith,Jane Smith,jane@example.com,Password@123\n";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "sample_users_import.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };



    //  when user click on the import button
    const handleImport = async () => {
        if (!selectedFile || !importResult?.validRows?.length) return
        setImporting(true)

        try {
            await importUsers({ users: importResult.validRows })
            onClose()
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            setImporting(false)
        }
    }

    // Disable import button if no file selected OR if loading/importing OR if 0 users were valid
    const isImportDisabled = !selectedFile || loading || importing || !importResult?.validRows?.length;

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-md ${shake ? 'shake' : ''}`}
                id="importUserModal"
                className="import-user-modal"
            >
                <div ref={modalRef}>
                    {/* Header */}
                    <Modal.Header className="border-0">
                        <Modal.Title>Import Users</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button className="btn-only-icon" onClick={onClose} type="button">
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>

                    {/* Body */}
                    <Modal.Body className="py-2">
                        {/* Label & Format Header */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="required-star form-label m-0">
                                Import file
                            </label>
                            <span className="custom-file-size">
                                CSV or XLSX — max 10MB
                            </span>
                        </div>

                        <div className="custom-file-upload ">
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                accept=".csv, .xlsx"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />

                            {/* File Selector Box */}
                            <div
                                className="custom-file-sub-box"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <button
                                    type="button"
                                    className="btn choose-file-btn"
                                >
                                    Choose file
                                </button>
                                <span className="text-muted small">
                                    {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "No file chosen"}
                                </span>

                            </div>
                        </div>

                        {/* Download Sample File Button */}
                        <div className="d-flex align-items-center mt-2">
                            <button
                                type="button"
                                onClick={downloadSampleCSV}
                                className="btn link-download-btn"
                            >
                                <img src={downloadIcon} width={22} alt="" className="download-icon" />
                                <span>Download sample file</span>
                            </button>
                        </div>

                        {/* Small Inline Loader when analyzing file */}
                        {loading && (
                            <div className="validating-file-loader mt-3">
                              <div className="file-upload-loader mr-3"></div>
                                <span className="small text-muted fw-medium">Validating file...</span>
                            </div>
                        )}

                        {/* Red Header Mismatch Error Message */}
                        {headerError && (
                            <div className="mt-3">
                                <p className="text-danger " style={{ whiteSpace: "pre-line", lineHeight: "1.4" }}>
                                    {headerError}
                                </p>
                            </div>
                        )}

                        {/*  error section */}
                        {importResult?.errorDetails && importResult.errorDetails.length > 0 && (
                            <div className="mt-3">
                                <p className="text-danger mb-2">
                                    {importResult.errors} User(s) have errors. Fix your file and re-select it.
                                </p>
                                <div className="import-error-table-wrapper">
                                    <table className="import-error-table">
                                        <thead>
                                            <tr>
                                                <th>Row</th>
                                                <th>Username / ID</th>
                                                <th>Email</th>
                                                <th>Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importResult.errorDetails.map((err, idx) => (
                                                <tr key={idx}>
                                                    <td className="cell-row">{err.row}</td>
                                                    <td className="cell-username">{err.user_id || "-"}</td>
                                                    <td className="cell-email">{err.email || "-"}</td>
                                                    <td className="cell-error">{err.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </Modal.Body>

                    {/* Footer */}
                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="btn-black btn-lg m-0"
                            type="button"
                            onClick={handleImport}
                            disabled={isImportDisabled}
                            style={{
                                opacity: isImportDisabled ? 0.6 : 1,
                                cursor: isImportDisabled ? "not-allowed" : "pointer"
                            }}
                        >
                            {importing ? "Importing..." : "Import"}
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default ImportUserModal;
