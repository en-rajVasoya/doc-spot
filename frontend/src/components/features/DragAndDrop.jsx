import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (isModalOpen || isSearchMode) return;

        const handleDragOver = (e) => {
            e.preventDefault();

            if (isModalOpen || isSearchMode) return;

            if (!isDragging) {
                setIsDragging(true);
            }
        };

        const handleDrop = async (e) => {
            e.preventDefault();

            console.log("========== DROP EVENT FIRED ==========");

            if (isModalOpen || isSearchMode) {
                console.log("[EXIT] Blocked because isModalOpen or isSearchMode is true");
                return;
            }

            setIsDragging(false);

            console.log("[DEBUG] dataTransfer types:", e.dataTransfer.types);

            const dragItems = [...e.dataTransfer.items];
            console.log("[DEBUG] dragItems length:", dragItems.length);

            if (!dragItems || dragItems.length === 0) {
                console.log("[EXIT] No dragItems at all, stopping here");
                return;
            }

            const fileList = [];

            const readDirectory = async (dirEntry, path = "") => {
                const reader = dirEntry.createReader();

                const readEntries = () => {
                    return new Promise((resolve, reject) => {
                        reader.readEntries(resolve, reject);
                    });
                };

                let entries = await readEntries();

                while (entries.length > 0) {
                    for (const entry of entries) {
                        if (entry.isFile) {
                            const file = await new Promise((res) => entry.file(res));

                            Object.defineProperty(file, "webkitRelativePath", {
                                value: path + dirEntry.name + "/" + file.name,
                            });

                            fileList.push(file);
                        } else if (entry.isDirectory) {
                            await readDirectory(entry, path + dirEntry.name + "/");
                        }
                    }

                    entries = await readEntries();
                }
            };

            for (const item of dragItems) {
                console.log("[DEBUG] item.kind:", item.kind, "| item.type:", item.type);
                const entry = item.webkitGetAsEntry?.();
                console.log("[DEBUG] webkitGetAsEntry result:", entry);

                if (!entry) {
                    console.log("[INFO] No entry for this item — likely NOT a real file (probably a web image/link)");
                    continue;
                }

                if (entry.isFile) {
                    console.log("[INFO] entry.isFile = true, treating as real file");
                    const file = item.getAsFile();
                    if (file) fileList.push(file);
                } else if (entry.isDirectory) {
                    console.log("[INFO] entry.isDirectory = true, reading folder recursively");
                    await readDirectory(entry);
                }
            }

            console.log("[DEBUG] fileList after real-file check:", fileList);

            if (fileList.length > 0) {
                console.log(`[PATH: REAL FILES] Starting upload for ${fileList.length} files...`);
                checkAndUpload(fileList, currentFolderId, items);
                return;
            }

            console.log("[PATH: NO REAL FILES FOUND] Moving to URL/web-image extraction...");

            // Handle dropped Google Images / Web Links
            let imageUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
            const htmlData = e.dataTransfer.getData("text/html");

            console.log("[DEBUG] text/uri-list or text/plain result:", imageUrl);
            console.log("[DEBUG] text/html result:", htmlData);

            if (htmlData) {
                const srcMatch = htmlData.match(/src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i);
                console.log("[DEBUG] regex match on text/html:", srcMatch);
                if (srcMatch && srcMatch[1]) {
                    imageUrl = decodeHtmlEntities(srcMatch[1]);
                    console.log("[INFO] imageUrl overwritten from html src match:", imageUrl);
                }
            }

            console.log("[DEBUG] FINAL imageUrl to be used:", imageUrl);

            if (!imageUrl) {
                console.log("[EXIT] No imageUrl could be extracted at all. Nothing to upload.");
                return;
            }

            try {
                let blob = null;

                const tryFetch = async (url) => {
                    console.log("[FETCH ATTEMPT] trying URL:", url);
                    const res = await fetch(url);
                    console.log("[FETCH RESPONSE] ok:", res.ok, "| status:", res.status);

                    if (!res.ok) {
                        console.log("[FETCH FAIL] Response not ok, throwing");
                        throw new Error("Bad response");
                    }

                    const contentType = res.headers.get("content-type") || "";
                    console.log("[FETCH RESPONSE] content-type:", contentType);

                    if (!contentType.startsWith("image/")) {
                        console.log("[FETCH FAIL] content-type is not image/*, throwing");
                        throw new Error("Not an image");
                    }

                    const contentLength = parseInt(res.headers.get("content-length") || "0");
                    console.log("[FETCH RESPONSE] content-length:", contentLength);

                    const MAX_SIZE = 20 * 1024 * 1024; // 20MB safety cap
                    if (contentLength && contentLength > MAX_SIZE) {
                        console.log("[FETCH FAIL] Too large based on header, throwing");
                        throw new Error("Too large");
                    }

                    const fetchedBlob = await res.blob();
                    console.log("[FETCH RESULT] blob size:", fetchedBlob.size, "| blob type:", fetchedBlob.type);

                    if (fetchedBlob.size > MAX_SIZE) {
                        console.log("[FETCH FAIL] Too large based on actual blob size, throwing");
                        throw new Error("Too large");
                    }
                    if (!fetchedBlob.type.startsWith("image/")) {
                        console.log("[FETCH FAIL] blob type is not image/*, throwing");
                        throw new Error("Not an image");
                    }

                    console.log("[FETCH SUCCESS] Valid image blob obtained");
                    return fetchedBlob;
                };

                if (imageUrl.startsWith("data:")) {
                    console.log("[PATH] imageUrl is a data: URL");
                    blob = await tryFetch(imageUrl);
                } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
                    console.log("[PATH] imageUrl is a normal http(s) URL — trying direct fetch first");
                    try {
                        blob = await tryFetch(imageUrl);
                    } catch (directErr) {
                        console.log("[DIRECT FETCH FAILED]", directErr.message, "— falling back to proxy");
                        try {
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
                            blob = await tryFetch(proxyUrl);
                        } catch (proxyErr) {
                            console.log("[PROXY FETCH ALSO FAILED]", proxyErr.message);
                            blob = null;
                        }
                    }
                } else {
                    console.log("[PATH] imageUrl doesn't match data: or http(s):, unknown format:", imageUrl);
                }

                if (blob) {
                    const fileExt = blob.type.split("/")[1]?.split("+")[0] || "png";
                    const file = new File([blob], `google_image_${Date.now()}.${fileExt}`, {
                        type: blob.type
                    });
                    console.log("[FINAL] Uploading constructed file:", file.name, file.size, file.type);
                    checkAndUpload([file], currentFolderId, items);
                } else {
                    console.warn("[FINAL] Could not fetch dropped image — source likely blocks cross-origin access, or proxy failed");
                }
            } catch (err) {
                console.error("[UNEXPECTED ERROR] Failed to extract dropped image:", err);
            }
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            // If relatedTarget is null, the mouse has physically left the browser window
            if (!e.relatedTarget) {
                setIsDragging(false);
            }
        };

        const handleMouseMove = () => {
            // mousemove ONLY fires when the user is NOT dragging a file.
            // If this fires while isDragging is true, it means they hit ESC or canceled the drag!
            if (isDragging) {
                setIsDragging(false);
            }
        };

        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("drop", handleDrop);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("drop", handleDrop);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [addFiles, currentFolderId, isDragging, isModalOpen, isSearchMode]);

    useEffect(() => {
        if (isModalOpen) {
            setIsDragging(false);
        }
    }, [isModalOpen]);

    return (
        <>
            {isDragging && !isModalOpen && !isSearchMode && (
                <div className="drag-and-drop-single-box">
                    <div className="drag-and-drop-img">
                        <InteractiveIcon defaultIcon={DragAndDropIcon} />
                    </div>
                </div>
            )}
        </>
    );
}

export default DragAndDrop;