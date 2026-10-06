import { useEffect, useState, useRef } from "react";
import { useUpload } from "../../context/UploadContext";
import { useFileExplorer } from "../../context/FileExplorerContext";
import InteractiveIcon from "../layout/InteractiveIcon";
import DragAndDropIcon from "@images/drag-and-drop-icon.svg";
import { useSearch } from "../../context/SearchContext";

const decodeHtmlEntities = (str) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
};

function DragAndDrop({ isModalOpen = false }) {
    const { addFiles, checkAndUpload } = useUpload();
    const { currentFolderId, items } = useFileExplorer();
    const { isSearchMode } = useSearch();
    const [isDragging, setIsDragging] = useState(false);

    // Keep dynamic values in a ref so the window event listeners are permanently attached
    // and NEVER unbind/rebind during rapid drag-and-drop actions.
    const stateRef = useRef({
        currentFolderId,
        items,
        checkAndUpload,
        isModalOpen,
        isSearchMode
    });

    useEffect(() => {
        stateRef.current = {
            currentFolderId,
            items,
            checkAndUpload,
            isModalOpen,
            isSearchMode
        };
    }, [currentFolderId, items, checkAndUpload, isModalOpen, isSearchMode]);

    // Track drag enter/leave depth across child elements
    const dragCounterRef = useRef(0);

    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();

            dragCounterRef.current += 1;

            const { isModalOpen: modalOpen, isSearchMode: searchMode } = stateRef.current;
            if (modalOpen || searchMode) return;

            setIsDragging(true);
        };

        const handleDragOver = (e) => {
            // ALWAYS prevent default to stop Chrome from opening the file in a new tab!
            e.preventDefault();
            e.stopPropagation();

            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "copy";
            }

            const { isModalOpen: modalOpen, isSearchMode: searchMode } = stateRef.current;
            if (modalOpen || searchMode) return;

            if (dragCounterRef.current === 0) {
                dragCounterRef.current = 1;
            }
            setIsDragging(true);
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();

            dragCounterRef.current -= 1;
            if (dragCounterRef.current <= 0 || !e.relatedTarget) {
                dragCounterRef.current = 0;
                setIsDragging(false);
            }
        };

        const handleDrop = async (e) => {
            // ALWAYS prevent default so the browser never opens the file as a URL
            e.preventDefault();
            e.stopPropagation();

            dragCounterRef.current = 0;
            setIsDragging(false);

            const {
                isModalOpen: modalOpen,
                isSearchMode: searchMode,
                checkAndUpload: uploadFn,
                currentFolderId: folderId,
                items: currentItems
            } = stateRef.current;

            if (modalOpen || searchMode) {
                return;
            }

            const dragItems = e.dataTransfer?.items ? [...e.dataTransfer.items] : [];
            if (!dragItems || dragItems.length === 0) {
                // Fallback to standard files list if items are unavailable
                if (e.dataTransfer?.files?.length > 0) {
                    uploadFn([...e.dataTransfer.files], folderId, currentItems);
                }
                return;
            }

            // CRITICAL: Extract all file/directory entries synchronously BEFORE any await calls.
            // In Chromium and modern browsers, DataTransferItem objects are invalidated as soon as
            // execution yields to the event loop.
            const looseFiles = [];
            const folderEntries = [];

            for (const item of dragItems) {
                const entry = item.webkitGetAsEntry?.();
                if (entry) {
                    if (entry.isDirectory) {
                        folderEntries.push(entry);
                    } else if (entry.isFile) {
                        const file = item.getAsFile();
                        if (file) looseFiles.push(file);
                    }
                } else if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (file) looseFiles.push(file);
                }
            }

            const readDirectory = async (dirEntry, path = "") => {
                const folderFiles = [];
                const reader = dirEntry.createReader();

                const readEntries = () => {
                    return new Promise((resolve, reject) => {
                        reader.readEntries(resolve, reject);
                    });
                };

                let hasEntries = false;
                let entries = await readEntries();

                while (entries.length > 0) {
                    hasEntries = true;
                    for (const entry of entries) {
                        if (entry.isFile) {
                            const file = await new Promise((res) => {
                                entry.file(res, (err) => {
                                    console.warn("Failed to get file from entry:", entry.name, err);
                                    res(null);
                                });
                            });

                            if (file) {
                                Object.defineProperty(file, "webkitRelativePath", {
                                    value: path + dirEntry.name + "/" + file.name,
                                });

                                folderFiles.push(file);
                            }
                        } else if (entry.isDirectory) {
                            const subFiles = await readDirectory(entry, path + dirEntry.name + "/");
                            folderFiles.push(...subFiles);
                        }
                    }

                    entries = await readEntries();
                }

                // If folder is empty, create a placeholder file so folder path is tracked and created
                if (!hasEntries) {
                    const emptyPath = path + dirEntry.name;
                    const placeholder = new File([""], ".keep", { type: "text/plain" });
                    Object.defineProperty(placeholder, "webkitRelativePath", {
                        value: `${emptyPath}/.keep`,
                        writable: false,
                    });
                    placeholder._isPlaceholder = true;
                    folderFiles.push(placeholder);
                }

                return folderFiles;
            };

            // Start uploading loose files immediately if present
            if (looseFiles.length > 0) {
                uploadFn(looseFiles, folderId, currentItems);
            }

            // Process each dropped folder independently so each gets its own session & conflict check
            let hasFolders = false;
            for (const dirEntry of folderEntries) {
                const currentFolderFiles = await readDirectory(dirEntry);
                if (currentFolderFiles.length > 0) {
                    hasFolders = true;
                    uploadFn(currentFolderFiles, folderId, currentItems);
                }
            }

            if (looseFiles.length > 0 || hasFolders) {
                return;
            }

            // Handle dropped Google Images / Web Links
            let imageUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
            const htmlData = e.dataTransfer.getData("text/html");

            if (htmlData) {
                const srcMatch = htmlData.match(/src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i);
                if (srcMatch && srcMatch[1]) {
                    imageUrl = decodeHtmlEntities(srcMatch[1]);
                }
            }

            if (!imageUrl) {
                return;
            }

            try {
                let blob = null;

                const tryFetch = async (url) => {
                    const res = await fetch(url);

                    if (!res.ok) {
                        throw new Error("Bad response");
                    }

                    const contentType = res.headers.get("content-type") || "";

                    if (!contentType.startsWith("image/")) {
                        throw new Error("Not an image");
                    }

                    const contentLength = parseInt(res.headers.get("content-length") || "0");
                    const MAX_SIZE = 20 * 1024 * 1024; // 20MB safety cap
                    if (contentLength && contentLength > MAX_SIZE) {
                        throw new Error("Too large");
                    }

                    const fetchedBlob = await res.blob();

                    if (fetchedBlob.size > MAX_SIZE) {
                        throw new Error("Too large");
                    }
                    if (!fetchedBlob.type.startsWith("image/")) {
                        throw new Error("Not an image");
                    }

                    return fetchedBlob;
                };

                if (imageUrl.startsWith("data:")) {
                    blob = await tryFetch(imageUrl);
                } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
                    try {
                        blob = await tryFetch(imageUrl);
                    } catch (directErr) {
                        try {
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
                            blob = await tryFetch(proxyUrl);
                        } catch (proxyErr) {
                            blob = null;
                        }
                    }
                }

                if (blob) {
                    const fileExt = blob.type.split("/")[1]?.split("+")[0] || "png";
                    const file = new File([blob], `google_image_${Date.now()}.${fileExt}`, {
                        type: blob.type
                    });
                    uploadFn([file], folderId, currentItems);
                }
            } catch (err) {
                console.error("[UNEXPECTED ERROR] Failed to extract dropped image:", err);
            }
        };

        const handleMouseMove = () => {
            if (dragCounterRef.current > 0) {
                dragCounterRef.current = 0;
                setIsDragging(false);
            }
        };

        const handleWindowBlur = () => {
            dragCounterRef.current = 0;
            setIsDragging(false);
        };

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("drop", handleDrop);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            dragCounterRef.current = 0;
            setIsDragging(false);
        }
    }, [isModalOpen]);

    return (
        <>
            {isDragging && !isModalOpen && !isSearchMode && (
                <div className="drag-and-drop-single-box" style={{ pointerEvents: "none" }}>
                    <div className="drag-and-drop-img">
                        <InteractiveIcon defaultIcon={DragAndDropIcon} />
                    </div>
                </div>
            )}
        </>
    );
}

export default DragAndDrop;