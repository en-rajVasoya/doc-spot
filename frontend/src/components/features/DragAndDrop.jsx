


import { useEffect, useState } from "react";
import { useUpload } from "../../context/UploadContext";
import { useFileExplorer } from "../../context/FileExplorerContext";
import InteractiveIcon from "../layout/InteractiveIcon";
import DragAndDropIcon from "@images/drag-and-drop-icon.svg";
import { useSearch } from "../../context/SearchContext";

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

            if (isModalOpen || isSearchMode) return;

            setIsDragging(false);

            const dragItems = [...e.dataTransfer.items];
            if (!dragItems || dragItems.length === 0) return;

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
                const entry = item.webkitGetAsEntry?.();
                if (!entry) continue;

                if (entry.isFile) {
                    const file = item.getAsFile();
                    if (file) fileList.push(file);
                } else if (entry.isDirectory) {
                    await readDirectory(entry);
                }
            }

            if (fileList.length > 0) {
                console.log(`Starting upload for ${fileList.length} files...`);
                checkAndUpload(fileList, currentFolderId, items);
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