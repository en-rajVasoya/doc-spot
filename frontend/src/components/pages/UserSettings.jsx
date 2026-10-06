import React, { useState, useRef, useEffect } from "react";
import { Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// Components
import MainHeader from "../layout/header/MainHeader";
import SidebarNav from "../layout/header/SidebarNav";
import InteractiveIcon from "../layout/InteractiveIcon";
import ModalManager from "../modals/ModalManager.jsx";

// Context
import { useAuth } from "../../context/AuthContext";
import { useFileExplorer } from "../../context/FileExplorerContext";
import { useDownload } from "../../context/DownloadContext";

// Icons
import settingIcon from "@images/icon/setting-icon.svg";
import navFolderIcon from "@images/icon/nav-folder-icon.svg";
import downloadIcon from "@images/icon/download.svg";
import useResponsive from "../../hooks/useResponsive.js";

function UserSettings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { clearSelection } = useFileExplorer();
    const { changeDownloadFolder, downloadFolderName, supportsFolderPicker } = useDownload();

    const [searchBarOpen, setSearchBarOpen] = useState(false);
    const [modals, setModalsState] = useState([]);

    // -- Dashboard Layout State --
    const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Active tab state - extensible for future settings
    const [activeTab, setActiveTab] = useState("downloads");

    const { isMobile, isTablet, isDesktop, isSmallMobile } = useResponsive();

    const setModal = (modalData) => {
        if (modalData === null) {
            setModalsState(prev => prev.slice(0, -1));
        } else {
            setModalsState(prev => [...prev, modalData]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setModal(null);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Calculate layout header height
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Clear any selected items from dashboard
    useEffect(() => {
        clearSelection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isFirefox = userAgent.indexOf("firefox") !== -1;
    const isSafari = userAgent.indexOf("safari") !== -1 && userAgent.indexOf("chrome") === -1 && userAgent.indexOf("android") === -1;

    const browserNoticeTitle = isFirefox ? "Firefox Notice:" : isSafari ? "Safari Notice:" : "Browser Notice:";
    const browserNoticeMsg = isFirefox
        ? "Firefox does not support direct folder selection via web apps. All downloads will save to your browser's default downloads location."
        : isSafari
            ? "Apple Safari does not support direct folder selection via web apps. All downloads will save to your default downloads location."
            : "Your browser does not support the File System Access API. Downloads will save to your default browser downloads location.";
    const browserNoticeTip = isFirefox
        ? 'To choose where files save for each download, enable "Always ask you where to save files" in Firefox Settings → General → Downloads, or use Google Chrome or Microsoft Edge for direct folder picking.'
        : isSafari
            ? 'You can set your default download folder in Safari Settings → General → File download location, or use Google Chrome or Microsoft Edge for direct folder picking.'
            : 'Please use Google Chrome or Microsoft Edge to choose a local download directory.';

    const handleChangeLocation = async () => {
        if (changeDownloadFolder) {
            await changeDownloadFolder();
        }
    };

    return (
        <div className="page-wrapper all-page-search-bar">
            <div className="content-wrapper-main">

                {/* 1. Main header top */}
                <div className="max-width-base-header" ref={headerRef}>
                    <MainHeader
                        setModal={setModal}
                        searchBarOpen={searchBarOpen}
                        setSearchBarOpen={setSearchBarOpen}
                        onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
                        disableSearch={true}
                    />
                </div>

                {/* 2. Main content view wrapper */}
                <div className="content-view-wrapper">
                    <div className="max-width-base" style={{ height: `calc(100dvh - ${headerHeight}px)`, overflow: 'hidden' }}>

                        <div className="edit-profile-header">
                            <InteractiveIcon defaultIcon={settingIcon} alt="Settings" width={24} height={24} />
                            Settings
                        </div>

                        {/* TABS */}
                        <div className="edit-profile-body">
                            <div className="edit-profile-content">

                                {/* ── LEFT SIDE TABS ── */}
                                <div className="nav-tab">
                                    <div className="nav-tab-list">
                                        <button
                                            className={`nav-tab-item ${activeTab === "downloads" ? "nav-tab-item-active" : ""}`}
                                            onClick={() => setActiveTab("downloads")}
                                        >
                                            Downloads
                                        </button>
                                        {/* Future setting tabs can easily be added here */}
                                    </div>
                                </div>

                                {/* ── RIGHT SIDE CONTENT ── */}
                                <div className="edit-profile-form-container">
                                    <div className="edit-profile-tab-pane-wrapper">
                                        {/* DOWNLOADS TAB */}
                                        {activeTab === "downloads" && (
                                            <div className="tab-pane fade-in">
                                                <Form.Group className="mb-3" controlId="downloadLocationInput">
                                                    <Form.Label>Current Download Location</Form.Label>
                                                    <div className="form-control-single-icon">
                                                        <InteractiveIcon
                                                            defaultIcon={navFolderIcon}
                                                            alt="Folder"
                                                            className="form-left-icon disabled-icon"
                                                            width={20}
                                                        />
                                                        <Form.Control
                                                            type="text"
                                                            readOnly
                                                            className="custom-form-control h-34"
                                                            value={
                                                                !supportsFolderPicker
                                                                    ? "Default Browser Downloads"
                                                                    : (downloadFolderName || "Not configured (Default Browser Downloads)")
                                                            }
                                                            placeholder="No folder chosen yet"
                                                            style={{ cursor: "default" }}
                                                        />
                                                    </div>
                                                    <div className="mt-2" style={{ fontSize: "12px", color: "var(--dark-60)", lineHeight: "18px" }}>
                                                        {supportsFolderPicker ? (
                                                            downloadFolderName ? (
                                                                <span>Files and folders will be saved to this folder on your computer.</span>
                                                            ) : (
                                                                <span>Click below to choose a dedicated folder on your computer for resumable downloads.</span>
                                                            )
                                                        ) : (
                                                            <span>Downloads are handled directly by your browser.</span>
                                                        )}
                                                    </div>
                                                </Form.Group>

                                                {supportsFolderPicker ? (
                                                    <div className="edit-profile-footer mt-4">
                                                        <button
                                                            type="button"
                                                            className="btn-black btn-lg m-0"
                                                            onClick={handleChangeLocation}
                                                        >
                                                            {downloadFolderName ? "Change Download Location" : "Select Download Location"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="alter-mag-box mt-3">
                                                        <div className="alter-mag-box-icon">
                                                            <svg width="20" height="20" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M3.69657 25.3794H24.308C26.5851 25.3794 28.0046 23.7451 28.0046 21.6829C28.0046 21.0669 27.844 20.4371 27.5091 19.8617L17.1834 1.87486C16.4863 0.656 15.268 0 14.0091 0C12.7634 0 11.5314 0.656 10.8211 1.87486L0.495429 19.8749C0.17224 20.4227 0.00120445 21.0468 0 21.6829C0 23.7457 1.43314 25.3794 3.69657 25.3794ZM3.72343 23.2766C2.78571 23.2766 2.16914 22.5131 2.16914 21.6829C2.16914 21.4417 2.20971 21.1606 2.344 20.8794L12.656 2.89257C12.9509 2.384 13.4869 2.14286 14.0091 2.14286C14.5314 2.14286 15.04 2.37029 15.3349 2.89257L25.6474 20.8926C25.7811 21.1611 25.848 21.4417 25.848 21.6829C25.848 22.5131 25.2051 23.2771 24.2811 23.2771L3.72343 23.2766ZM14.0091 16.3526C14.652 16.3526 15.0263 15.9777 15.04 15.2811L15.2274 8.22343C15.2411 7.54 14.7051 7.03143 13.9954 7.03143C13.2726 7.03143 12.7634 7.52686 12.7766 8.20971L12.9509 15.2811C12.964 15.9646 13.3394 16.3526 14.0091 16.3526ZM14.0091 20.7051C14.7857 20.7051 15.4549 20.0891 15.4549 19.3126C15.4549 18.5223 14.7989 17.9194 14.0091 17.9194C13.2189 17.9194 12.5623 18.5354 12.5623 19.3126C12.5623 20.076 13.232 20.7051 14.0091 20.7051Z" fill="#FFC70F" />
                                                            </svg>
                                                        </div>
                                                        <div className="alter-mag-sub">
                                                            <div className="title">
                                                                {browserNoticeTitle}
                                                            </div>
                                                            <p className="m-0">
                                                                {browserNoticeMsg}
                                                            </p>
                                                            <p className="m-0 mt-2">
                                                                <b>Tip: </b>{browserNoticeTip}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* 3. Sidebar Menu and Modal Manager */}
            <SidebarNav isSidebarNavOpen={isSidebarNavOpen} closeSidebar={() => setIsSidebarNavOpen(false)} />
            <ModalManager modals={modals} setModal={setModal} />

        </div>
    );
}

export default UserSettings;
