import Modal from "react-bootstrap/Modal";
import { useState, useRef, useMemo, useEffect } from "react";
import { Form } from "react-bootstrap";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg";
import emailIcon from "@images/icon/email.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
import passwordIcon from "@images/icon/password.svg";
import userIcon from "@images/icon/user.svg";
import uploadeIcon from "@images/icon/uploade-icon.svg";
import { useAdmin } from "../../context/AdminContext";
import UserAvatar from '../layout/UserAvatar';
import CustomScroll from "../layout/CustomScroll";
import AnimatedLogo from "./AnimatedLogo";
import { useAuth } from "../../context/AuthContext";

function EditProfileModal({ onClose, setModal }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);


    const { user, updateProfile } = useAuth();

    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [email, setEmail] = useState("");
    const [statusActive, setStatusActive] = useState(true);
    const [role, setRole] = useState("user");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.name || "");
            setUsername(user.user_id || "");
            setEmail(user.email || "");
            setAvatarUrl(user.profilePic || null);
        }
    }, [user]);

    const [avatarUrl, setAvatarUrl] = useState(null);
    const fileInputRef = useRef(null);

    const [errors, setErrors] = useState({});

    // / live password requirement checks - recalculates whenever `password` changes
    const checks = useMemo(() => [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[@$!%*?&]/.test(password),
        password.length >= 8,
    ], [password]);

    const clearErr = (field) =>
        setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };

    const [avatarFile, setAvatarFile] = useState(null); // Added this to store the cropped file!

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Create a temporary URL for the selected file
        const url = URL.createObjectURL(file);

        // 2. Open the crop modal with the selected image!
        setModal({
            type: "cropImageModal",
            data: {
                imgSrc: url,
                onSave: (croppedUrl, croppedFile) => {
                    setAvatarUrl(croppedUrl); // Show cropped image in UI
                    setAvatarFile(croppedFile); // Store the physical cropped file to send to backend!
                    setModal(null); // Close the crop modal
                }
            }
        });

        e.target.value = null; // Reset input
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

        if (password || currentPassword) {
            if (!currentPassword) {
                newErrors.currentPassword = "Current password is required to set a new password";
            }
            if (!password) {
                newErrors.password = "New password is required";
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setShake(true);
            setTimeout(() => setShake(false), 400);
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("name", displayName);
        formData.append("user_id", username);

        if (password || currentPassword) {
            formData.append("password", password);
            formData.append("currentPassword", currentPassword);
        }
        if (avatarFile) {
            formData.append("profilePic", avatarFile);
        }

        const result = await updateProfile(formData);
        setLoading(false);

        if (result.success) {
            onClose();
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };



    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={` ${shake ? "shake" : ""}`}
                className="edit-profile-modal"
            >
                <Modal.Header className="border-0">
                                <Modal.Title>Edit Profile</Modal.Title>
                                <Tooltip text="Close" offset={8}>
                                    <button
                                        className="btn-only-icon"
                                        onClick={onClose}
                                    >
                                        <InteractiveIcon defaultIcon={closeIcon} width={24} alt="add" />
                                    </button>
                                </Tooltip>
                            </Modal.Header>
                <Modal.Body ref={modalRef} className="p-0">
                  


                        {/* ── RIGHT FORM PANEL ── */}
                       

                            
                            {/* Scrollable form area */}
                            <CustomScroll className="edit-profile-custom-scroll-body" showBottomBlur={false} showTopBlur={false}>
                                <div className="edit-profile-form-container">

                                    {/* ── Avatar Section ── */}
                                    <div className="edit-profile-avatar-section">
                                        <div className="profile-single-box">
                                            <UserAvatar src={avatarUrl} name={displayName} />
                                        </div>

                                        <div className="edit-profile-avatar-actions">
                                            {/* Hidden file input */}
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

                                    {/* ── Personal Info ── */}
                                    <div className="edit-profile-section-label">Personal Information</div>

                                    <div className="row">
                                        <div className="col-md-6">
                                            {/* Username */}
                                            <Form.Group className="mb-3" controlId="addUserUsername">
                                                <Form.Label className="required-star">Username / ID</Form.Label>
                                                <div className={`form-control-single-icon${errors.username ? " has-error" : ""}`}>
                                                    <InteractiveIcon
                                                        defaultIcon={userIcon}
                                                        alt=""
                                                        className="form-left-icon"
                                                        width={20}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        autoComplete="new-password"
                                                        placeholder="Enter Username"
                                                        className={`custom-form-control h-34${errors.username ? " is-invalid" : ""}`}
                                                        value={username}
                                                        onChange={(e) => { setUsername(e.target.value); clearErr("username"); }}
                                                    />
                                                </div>
                                                {errors.username && (
                                                    <div className="invalid-feedback d-block">{errors.username}</div>
                                                )}
                                            </Form.Group>
                                        </div>
                                        <div className="col-md-6">
                                            {/* Display Name */}
                                            <Form.Group className="mb-3" controlId="addUserDisplayName">
                                                <Form.Label className="required-star">Display Name</Form.Label>
                                                <div className={`form-control-single-icon${errors.displayName ? " has-error" : ""}`}>
                                                    <InteractiveIcon
                                                        defaultIcon={userIcon}
                                                        alt=""
                                                        className="form-left-icon"
                                                        width={20}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter Display Name"
                                                        className={`custom-form-control h-34${errors.displayName ? " is-invalid" : ""}`}
                                                        value={displayName}
                                                        onChange={(e) => { setDisplayName(e.target.value); clearErr("displayName"); }}
                                                    />
                                                </div>
                                                {errors.displayName && (
                                                    <div className="invalid-feedback d-block">{errors.displayName}</div>
                                                )}
                                            </Form.Group>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <Form.Group className="mb-3" controlId="addUserEmail">
                                        <Form.Label className="required-star">Email</Form.Label>
                                        <div className={`form-control-single-icon${errors.email ? " has-error" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={emailIcon}
                                                alt=""
                                                className="form-left-icon disabled-icon"
                                                width={20}
                                            />
                                            <Form.Control
                                                type="email"
                                                placeholder="Enter Email"
                                                className={`custom-form-control h-34${errors.email ? " is-invalid" : ""}`}
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
                                                disabled
                                            />
                                        </div>
                                        {errors.email && (
                                            <div className="invalid-feedback d-block">{errors.email}</div>
                                        )}
                                    </Form.Group>

                                    {/* ── Security ── */}
                                    <div className="edit-profile-section-label">Security</div>




                                    {/* Current Password */}
                                    <Form.Group className="mb-3 position-relative" controlId="addCurrentPassword">
                                        <Form.Label className="required-star">Current Password</Form.Label>
                                        <div className={`form-control-single-icon${errors.currentPassword ? " has-error" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={passwordIcon}
                                                alt=""
                                                className="form-left-icon"
                                                width={20}
                                            />
                                            <InteractiveIcon
                                                defaultIcon={showCurrentPwd ? viewIcon : viewHideIcon}
                                                alt=""
                                                className="form-right-icon"
                                                width={24}
                                                onClick={() => setShowCurrentPwd((p) => !p)}
                                            />
                                            <Form.Control
                                                type={showCurrentPwd ? "text" : "password"}
                                                autoComplete="current-password"
                                                placeholder="Enter Current Password"
                                                className={`custom-form-control h-34${errors.currentPassword ? " is-invalid" : ""}`}
                                                value={currentPassword}
                                                onChange={(e) => { setCurrentPassword(e.target.value); clearErr("currentPassword"); }}
                                            />
                                        </div>
                                        {errors.currentPassword && (
                                            <div className="invalid-feedback d-block">{errors.currentPassword}</div>
                                        )}
                                    </Form.Group>

                                    {/* New Password */}
                                    <Form.Group className="mb-3 position-relative" controlId="addUserPassword">
                                        <Form.Label className="required-star">New Password</Form.Label>
                                        <div className={`form-control-single-icon${errors.password ? " has-error" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={passwordIcon}
                                                alt=""
                                                className="form-left-icon"
                                                width={20}
                                            />
                                            <InteractiveIcon
                                                defaultIcon={showPwd ? viewIcon : viewHideIcon}
                                                alt=""
                                                className="form-right-icon"
                                                width={24}
                                                onClick={() => setShowPwd((p) => !p)}
                                            />
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
                                                    <li className={`pwd-req-item ${checks[0] ? "pass" : "fail"}`}>
                                                        <span className="pwd-req-icon">{checks[0] ? "✓" : "✕"}</span>
                                                        Password must include at least one uppercase letter.
                                                    </li>
                                                    <li className={`pwd-req-item ${checks[1] ? "pass" : "fail"}`}>
                                                        <span className="pwd-req-icon">{checks[1] ? "✓" : "✕"}</span>
                                                        Password must include at least one lowercase letter.
                                                    </li>
                                                    <li className={`pwd-req-item ${checks[2] ? "pass" : "fail"}`}>
                                                        <span className="pwd-req-icon">{checks[2] ? "✓" : "✕"}</span>
                                                        Password must include at least one number.
                                                    </li>
                                                    <li className={`pwd-req-item ${checks[3] ? "pass" : "fail"}`}>
                                                        <span className="pwd-req-icon">{checks[3] ? "✓" : "✕"}</span>
                                                        Password must include at least one special character.
                                                    </li>
                                                    <li className={`pwd-req-item ${checks[4] ? "pass" : "fail"}`}>
                                                        <span className="pwd-req-icon">{checks[4] ? "✓" : "✕"}</span>
                                                        Password must be at least eight characters long.
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                        {errors.password && (
                                            <div className="invalid-feedback d-block">{errors.password}</div>
                                        )}
                                    </Form.Group>

                                   

                                </div>
                            </CustomScroll>
                      

                        

                   
                </Modal.Body>
                <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                            
                           
                                <button className="btn-secondary btn-lg " onClick={onClose} disabled={loading}>Cancel</button>
                               
                                <button
                                    className="btn-black btn-lg "
                                   onClick={handleSave} disabled={loading}
                                >
                                    Save
                                </button>
                            
                        </Modal.Footer>
            </Modal>
        </div>
    );
}

export default EditProfileModal;