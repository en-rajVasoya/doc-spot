
import { useEffect } from "react";
import Tooltip from "../Tooltip";
import InteractiveIcon from "../InteractiveIcon";
import { Dropdown } from "react-bootstrap";
import closeIcon from "@images/icon/close.svg";
import userPlusIcon from "@images/icon/user-plus.svg";
import downloadIcon from "@images/icon/download.svg";
import renameIcon from "@images/icon/rename.svg";
import colorIcon from "@images/icon/color.svg";
import copyIcon from "@images/icon/copy.svg";
import moveIcon from "@images/icon/move.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import fileInfoIcon from "@images/icon/file-info.svg";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useDownload } from "../../../context/DownloadContext";
import { useSearch } from "../../../context/SearchContext";

function HeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen}) {
    const { selectedIds, setSelectedIds, items, changeColorApi, isViewerOnly  } = useFileExplorer();
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
    const { isSearchMode, searchResults } = useSearch();

    // decide which items list to use based on search mode
    const displayItems = isSearchMode ? searchResults : items;

    //  when user selectes folder or file  get that data
    const selectedArray = Array.from(selectedIds);
    const selectedItem = displayItems.find(
        item => item._id === selectedArray[0]
    );

    const hasFolder =
        selectedArray.length > 0 &&
        selectedArray.every(
            id => displayItems.find(i => i._id === id)?.type === "folder"
        )

    // if there is no selected icons here
    const isDisabled = selectedIds.size === 0;

    useEffect(() => {
            if (selectedIds && selectedIds.size > 0) {
                setSearchBarOpen(false);
            }
        }, [selectedIds, setSearchBarOpen]);
    return (
        <>
            {!searchBarOpen && (
                <div className="toolbar-box d-block" >
                    <div className="toolbar">
                        <div className="toolbar-container">
                            <div className="d-flex align-items-center">
                                {selectedIds.size !== 0 && (
                                    <div className="selection-count">
                                        <span className="cursor-pointer">
                                            <InteractiveIcon
                                                defaultIcon={closeIcon}
                                                width={24}
                                                alt=""
                                                onClick={() => setSelectedIds(new Set())}
                                            />
                                        </span>
                                        {selectedIds.size} selected
                                    </div>
                                )}

                                <ul className="mb-0 tools">
                                    {/* Shrare */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Share" placement="bottom" theme={`${isDisabled || isViewerOnly ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={userPlusIcon}
                                                alt="Share"
                                                className={`${selectedIds.size === 0 || isViewerOnly ? "disabled" : ""}`}
                                                onClick={!isDisabled && !isViewerOnly ? () => setModal({ type: 'shareUser', data: Array.from(selectedIds) }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/*  Download */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Download" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={downloadIcon}
                                                alt="Download"
                                                className={`${selectedIds.size === 0 ? "disabled" : ""}`}
                                                onClick={() => {
                                                    if (isDisabled) return

                                                    const selectedItems = selectedArray
                                                        .map(id => displayItems.find(i => i._id === id))
                                                        .filter(Boolean)
                                                    if (selectedItems.length === 1) {
                                                        const item = selectedItems[0]
                                                        if (item.type === "file") {
                                                            downloadFile(item)
                                                        } else {
                                                            downloadFolder(item)
                                                        }
                                                    } else {
                                                        downloadMultiple(selectedItems)
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/* RENAME */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Rename" placement="bottom" theme={`${isDisabled || isViewerOnly ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={renameIcon}
                                                alt="Rename"
                                                className={`${selectedIds.size !== 1 || isViewerOnly ? "disabled" : ""}`}
                                                onClick={
                                                    !isDisabled && !isViewerOnly && selectedIds.size === 1 ? () => setModal({ type: "RenameModal", data: selectedItem }) : undefined
                                                }
                                            />
                                        </Tooltip>
                                    </li>

                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Dropdown
                                            popperConfig={{ strategy: "fixed" }}
                                            container={document.body}
                                            show={hasFolder && !isViewerOnly ? undefined : false}
                                        >
                                            <Dropdown.Toggle className="no-border-btn">
                                                <Tooltip
                                                    text="Change Color"
                                                    placement="bottom"
                                                    theme={`${!hasFolder || isViewerOnly ? "disabled" : ""}`}
                                                >
                                                    <InteractiveIcon
                                                        defaultIcon={colorIcon}
                                                        alt="Change Color"
                                                        className={`${!hasFolder || isViewerOnly ? "disabled" : ""}`}
                                                    />
                                                </Tooltip>
                                            </Dropdown.Toggle>

                                            {/* color for folders  */}
                                            {selectedIds.size !== 0 && hasFolder && (
                                                <Dropdown.Menu className="colors-dd" style={{ zIndex: 9999 }}>
                                                    <p className="title mb-3">Folder Color </p>
                                                    <div className="d-flex align-items-center flex-wrap color-list">

                                                        {/* red */}
                                                        <Dropdown.Item className="cursor-pointer color red"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "red")} >
                                                        </Dropdown.Item>
                                                        {/* orange */}
                                                        <Dropdown.Item className="cursor-pointer color orange"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "orange")}>
                                                        </Dropdown.Item>
                                                        {/* yellow */}
                                                        <Dropdown.Item className="cursor-pointer color yellow active"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "yellow")}>
                                                        </Dropdown.Item>
                                                        {/* green */}
                                                        <Dropdown.Item className="cursor-pointer color green"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "green")}>
                                                        </Dropdown.Item>
                                                        {/* green - dark */}
                                                        <Dropdown.Item className="cursor-pointer color green-dark"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "green-dark")}>
                                                        </Dropdown.Item>
                                                        {/* blue */}
                                                        <Dropdown.Item className="cursor-pointer color blue"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "blue")}>
                                                        </Dropdown.Item>
                                                        {/* violet */}
                                                        <Dropdown.Item className="cursor-pointer color violet"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "violet")}>
                                                        </Dropdown.Item>
                                                        {/* pink */}
                                                        <Dropdown.Item className="cursor-pointer color pink"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "pink")}>
                                                        </Dropdown.Item>
                                                        {/* gray */}
                                                        <Dropdown.Item className="cursor-pointer color gray"
                                                            onClick={() => changeColorApi(Array.from(selectedIds), "gray")}>
                                                        </Dropdown.Item>

                                                    </div>
                                                </Dropdown.Menu>
                                            )}
                                        </Dropdown>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Copy" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={copyIcon}
                                                className={`${selectedIds.size === 0 ? "disabled" : ""}`}
                                                alt="Copy"
                                                onClick={!isDisabled ? () => setModal({ type: 'CopyModal', data: Array.from(selectedIds) }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/*  Move */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Move" placement="bottom" theme={`${isDisabled || isViewerOnly ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={moveIcon}
                                                className={`${selectedIds.size === 0 || isViewerOnly ? "disabled" : ""}`}
                                                alt="Move"
                                                onClick={!isDisabled && !isViewerOnly ? () => setModal({ type: 'MoveModal', data: Array.from(selectedIds) }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                     {/*  File info */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Item Info" placement="bottom" theme={`${isDisabled || isViewerOnly ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={fileInfoIcon}
                                                className={`${selectedIds.size === 0  || isViewerOnly? "disabled" : ""}`}
                                                alt="Delete"                                                
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/*  Move to Trash */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Delete" placement="bottom" theme={`${isDisabled || isViewerOnly ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={deleteIcon}
                                                className={`${selectedIds.size === 0  || isViewerOnly? "disabled" : ""}`}
                                                alt="Delete"
                                                onClick={!isDisabled && !isViewerOnly ? () => setModal({ type: 'DeleteModal', data: Array.from(selectedIds) }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <button className="header-search-btn" onClick={(e) => { setSearchBarOpen(prev => !prev); }}>
                                            <InteractiveIcon
                                                defaultIcon={searchIconWhite}                                                
                                                alt="Delete"   
                                                width={24}
                                                height={24}                                     
                                            />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>

    )
}

export default HeaderToolbar
