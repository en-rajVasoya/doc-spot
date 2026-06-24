import React, { useState, useRef, useMemo, useEffect } from "react";
import { Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// Components
import MainHeader from "../layout/header/MainHeader";
import SidebarNav from "../layout/header/SidebarNav";
import InteractiveIcon from "../layout/InteractiveIcon";
import UserAvatar from '../layout/UserAvatar';
import ModalManager from "../modals/ModalManager.jsx";

// Context
import { useAuth } from "../../context/AuthContext";
import { getRoute } from "../../utils/getRoutes.js";

// Icons
import emailIcon from "@images/icon/email.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
import passwordIcon from "@images/icon/password.svg";
import userIcon from "@images/icon/user.svg";

function UpdateUserProfile() {
    const navigate = useNavigate();
    const { user, updateProfile } = useAuth();

    const [searchBarOpen, setSearchBarOpen] = useState(false);
    const [modals, setModalsState] = useState([]);

    // -- Dashboard Layout State --
    const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // -- Profile Form State --
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [errors, setErrors] = useState({});


    //  here this state is used for active tabe like personal info and passwrod tab here
    const [activeTab, setActiveTab] = useState("personal")

    const fileInputRef = useRef(null);


    const setModal = (modalData) => {
        if (modalData === null) {
            setModalsState(prev => prev.slice(0, -1));
        } else {
            setModalsState(prev => [...prev, modalData]);
        }
    }

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setModal(null)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Calculate layout header height
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Load initial user data
    useEffect(() => {
        if (user) {
            setDisplayName(user.name || "");
            setUsername(user.user_id || "");
            setEmail(user.email || "");
            setAvatarUrl(user.profilePic || null);
        }
    }, [user]);

    // Live password checks
    const checks = useMemo(() => [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[@$!%*?&]/.test(password),
        password.length >= 8,
    ], [password]);

    const clearErr = (field) => setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });

    // Image Upload Handlers
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Open the crop modal with the selected image
        setModal({
            type: "cropImageModal",
            data: {
                imgSrc: URL.createObjectURL(file), // <-- CHANGE THIS from imageSrc to imgSrc
                onSave: (croppedUrl, croppedFile) => {
                    setAvatarUrl(croppedUrl); // Show the cropped image in the UI
                    setAvatarFile(croppedFile); // Store the actual cropped file for the backend
                    setModal(null); // Close the modal after saving
                }
            }
        });
        // Reset the input so the user can select the same file again if needed
        e.target.value = null;
    };

    const handleRemoveImage = () => {
        setAvatarUrl(null);
        setAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSave = async () => {
        let newErrors = {};
        if (!displayName.trim()) newErrors.displayName = "Display Name is required";
        if (!username.trim()) newErrors.username = "Username/ID is required";

        if (password && checks.includes(false)) {
            newErrors.password = "Password does not meet all requirements";
        }

        if (password && !currentPassword) {
            newErrors.currentPassword = "Current password is required to set a new password";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("name", displayName);
        formData.append("user_id", username);

        if (password) {
            formData.append("password", password);
            formData.append("currentPassword", currentPassword);
        }
        if (avatarFile) {
            formData.append("profilePic", avatarFile);
        }

        const result = await updateProfile(formData);
        setLoading(false);


    };

    return (
        <div className="page-wrapper">
            <div className="content-wrapper-main">

                {/* 1. Main header top (Exact same class as Dashboard) */}
                <div className="max-width-base-header" ref={headerRef}>
                    <MainHeader
                        setModal={setModal}
                        searchBarOpen={searchBarOpen}
                        setSearchBarOpen={setSearchBarOpen}
                        onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
                    />
                </div>

                {/* 2. Main content view wrapper (Exact same class as Dashboard) */}
                <div className="content-view-wrapper">
                    <div className="max-width-base" style={{ height: `calc(100dvh - ${headerHeight}px)`, overflow: 'auto' }}>

                        <div className="edit-profile-header">
                            Edit Profile
                        </div>


                        {/* TABS  */}
                        <div className="bg-white border rounded-3 overflow-hidden shadow-sm" style={{ maxWidth: "1000px" }}>
                            <div className="d-flex flex-column flex-md-row">

                                {/* ── LEFT SIDE TABS ── */}
                                <div className="profile-tabs-sidebar border-end p-4" style={{ minWidth: "250px", backgroundColor: "#fcfcfc" }}>
                                    <div className="d-flex flex-column gap-2">
                                        <button
                                            className={`btn text-start fw-medium border-0 px-3 py-2 ${activeTab === "personal" ? "bg-dark text-white shadow-sm" : "bg-transparent text-muted hover-bg-light"}`}
                                            onClick={() => setActiveTab("personal")}
                                        >
                                            Personal Information
                                        </button>
                                        <button
                                            className={`btn text-start fw-medium border-0 px-3 py-2 ${activeTab === "password" ? "bg-dark text-white shadow-sm" : "bg-transparent text-muted hover-bg-light"}`}
                                            onClick={() => setActiveTab("password")}
                                        >
                                            Password
                                        </button>
                                    </div>
                                </div>

                                {/* ── RIGHT SIDE CONTENT ── */}
                                <div className="profile-tab-content flex-grow-1 p-4 p-md-5 edit-profile-form-container" style={{ maxWidth: "100%" }}>
                                    
                                    {/* PERSONAL INFORMATION TAB */}
                                    {activeTab === "personal" && (
                                        <div className="tab-pane fade-in">
                                            {/* Avatar Section */}
                                            <div className="edit-profile-avatar-section">
                                                <div className="profile-single-box">
                                                    <UserAvatar src={avatarUrl} name={displayName} />
                                                </div>

                                                <div className="edit-profile-avatar-actions">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        style={{ display: "none" }}
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                    />
                                                    <button
                                                        className="btn-black btn-lg m-0"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        Upload Profile
                                                    </button>
                                                    {avatarUrl && (
                                                        <button className="btn-secondary btn-lg m-0" onClick={handleRemoveImage}>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <Form.Group className="mb-3" controlId="addUserUsername">
                                                <Form.Label >Username / ID</Form.Label>
                                                <div className={`form-control-single-icon${errors.username ? " has-error" : ""}`}>
                                                    <InteractiveIcon defaultIcon={userIcon} alt="" className="form-left-icon disabled-icon" width={20} />
                                                    <Form.Control
                                                        type="text"
                                                        autoComplete="new-password"
                                                        placeholder="Enter Username"
                                                        className={`custom-form-control h-34${errors.username ? " is-invalid" : ""}`}
                                                        value={username}
                                                        onChange={(e) => { setUsername(e.target.value); clearErr("username"); }}
                                                        disabled
                                                    />
                                                </div>
                                                {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
                                            </Form.Group>

                                            {/* Display Name */}
                                            <Form.Group className="mb-3" controlId="addUserDisplayName">
                                                <Form.Label className="required-star">Display Name</Form.Label>
                                                <div className={`form-control-single-icon${errors.displayName ? " has-error" : ""}`}>
                                                    <InteractiveIcon defaultIcon={userIcon} alt="" className="form-left-icon" width={20} />
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter Display Name"
                                                        className={`custom-form-control h-34${errors.displayName ? " is-invalid" : ""}`}
                                                        value={displayName}
                                                        onChange={(e) => { setDisplayName(e.target.value); clearErr("displayName"); }}
                                                    />
                                                </div>
                                                {errors.displayName && <div className="invalid-feedback d-block">{errors.displayName}</div>}
                                            </Form.Group>

                                            {/* Email */}
                                            <Form.Group className="mb-3" controlId="addUserEmail">
                                                <Form.Label >Email</Form.Label>
                                                <div className={`form-control-single-icon${errors.email ? " has-error" : ""}`}>
                                                    <InteractiveIcon defaultIcon={emailIcon} alt="" className="form-left-icon disabled-icon" width={20} />
                                                    <Form.Control
                                                        type="email"
                                                        placeholder="Enter Email"
                                                        className={`custom-form-control h-34${errors.email ? " is-invalid" : ""}`}
                                                        value={email}
                                                        onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
                                                        disabled
                                                    />
                                                </div>
                                                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                                            </Form.Group>
                                        </div>
                                    )}

                                    {/* PASSWORD TAB */}
                                    {activeTab === "password" && (
                                        <div className="tab-pane fade-in">
                                            {/* Current Password */}
                                            <Form.Group className="mb-3 position-relative" controlId="addCurrentPassword">
                                                <Form.Label className="required-star">Current Password</Form.Label>
                                                <div className={`form-control-single-icon${errors.currentPassword ? " has-error" : ""}`}>
                                                    <InteractiveIcon defaultIcon={passwordIcon} alt="" className="form-left-icon" width={20} />
                                                    <InteractiveIcon defaultIcon={showCurrentPwd ? viewIcon : viewHideIcon} alt="" className="form-right-icon" width={24} onClick={() => setShowCurrentPwd((p) => !p)} />
                                                    <Form.Control
                                                        type={showCurrentPwd ? "text" : "password"}
                                                        autoComplete="current-password"
                                                        placeholder="Enter Current Password"
                                                        className={`custom-form-control h-34${errors.currentPassword ? " is-invalid" : ""}`}
                                                        value={currentPassword}
                                                        onChange={(e) => { setCurrentPassword(e.target.value); clearErr("currentPassword"); }}
                                                    />
                                                </div>
                                                {errors.currentPassword && <div className="invalid-feedback d-block">{errors.currentPassword}</div>}
                                            </Form.Group>

                                            {/* New Password */}
                                            <Form.Group className="mb-3 position-relative" controlId="addUserPassword">
                                                <Form.Label className="required-star">New Password</Form.Label>
                                                <div className={`form-control-single-icon${errors.password ? " has-error" : ""}`}>
                                                    <InteractiveIcon defaultIcon={passwordIcon} alt="" className="form-left-icon" width={20} />
                                                    <InteractiveIcon defaultIcon={showPwd ? viewIcon : viewHideIcon} alt="" className="form-right-icon" width={24} onClick={() => setShowPwd((p) => !p)} />
                                                    <Form.Control
                                                        type={showPwd ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        placeholder="Enter New Password"
                                                        className={`custom-form-control h-34${errors.password ? " is-invalid" : ""}`}
                                                        value={password}
                                                        onChange={(e) => { setPassword(e.target.value); clearErr("password"); }}
                                                    />
                                                </div>
                                                {password.length > 0 && (
                                                    <div className="pwd-requirements-box">
                                                        <ul className="pwd-req-list">
                                                            <li className={`pwd-req-item ${checks[0] ? "pass" : "fail"}`}><span className="pwd-req-icon">{checks[0] ? "✓" : "✕"}</span> Password must include at least one uppercase letter.</li>
                                                            <li className={`pwd-req-item ${checks[1] ? "pass" : "fail"}`}><span className="pwd-req-icon">{checks[1] ? "✓" : "✕"}</span> Password must include at least one lowercase letter.</li>
                                                            <li className={`pwd-req-item ${checks[2] ? "pass" : "fail"}`}><span className="pwd-req-icon">{checks[2] ? "✓" : "✕"}</span> Password must include at least one number.</li>
                                                            <li className={`pwd-req-item ${checks[3] ? "pass" : "fail"}`}><span className="pwd-req-icon">{checks[3] ? "✓" : "✕"}</span> Password must include at least one special character.</li>
                                                            <li className={`pwd-req-item ${checks[4] ? "pass" : "fail"}`}><span className="pwd-req-icon">{checks[4] ? "✓" : "✕"}</span> Password must be at least eight characters long.</li>
                                                        </ul>
                                                    </div>
                                                )}
                                                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                                            </Form.Group>
                                        </div>
                                    )}

                                    {/* SAVE BUTTONS */}
                                    <div className="d-flex align-items-center justify-content-end gap-3 mt-5 pt-4 border-top">
                                        <button className="btn-secondary btn-lg m-0" onClick={() => navigate(getRoute.DASHBOARD)} disabled={loading}>Cancel</button>
                                        <button className="btn-black btn-lg m-0" onClick={handleSave} disabled={loading}>Save</button>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>


                        {/* ========================================= */}

                    </div>
                </div>

            </div>

            {/* 3. The Sidebar Menu (Exact same as Dashboard) */}
            <SidebarNav isSidebarNavOpen={isSidebarNavOpen} />
            <ModalManager modals={modals} setModal={setModal} />

        </div>
    );
}

export default UpdateUserProfile;
