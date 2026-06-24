import Modal from "react-bootstrap/Modal";
import { useState, useRef, useMemo } from "react";
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

function AddUserAdminModal({ onClose, setModal }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const { createUser, checkAvailability } = useAdmin();

    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState("");
    const [statusActive, setStatusActive] = useState(true);
    const [role, setRole] = useState("user");

    const [avatarUrl, setAvatarUrl] = useState(null);
    const fileInputRef = useRef(null);

    const [errors, setErrors] = useState({});

    // / live password requirement checks - recalculates whenever `password` changes
    const checks = useMemo(() => [
        /[A-Z]/.test(password),           // checks[0] - uppercase
        /[a-z]/.test(password),           // checks[1] - lowercase
        /\d/.test(password),              // checks[2] - number
        /[@$!%*?&]/.test(password),       // checks[3] - special char
        password.length >= 8,             // checks[4] - min length
    ], [password]);

    const clearErr = (field) =>
        setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });

    const checkUserIdAvailability = async () => {
        if (!username.trim()) return;
        const taken = await checkAvailability({ user_id: username });
        if (taken) {
            setErrors(prev => ({ ...prev, username: "User ID already taken." }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.username;
                return newErrors;
            });
        }
    };

    const checkEmailAvailability = async () => {
        if (!email.trim()) return;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim().toLowerCase())) {
            setErrors(prev => ({ ...prev, email: "Valid email is required." }));
            return;
        }
        const taken = await checkAvailability({ email: email });
        if (taken) {
            setErrors(prev => ({ ...prev, email: "Email already registered." }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.email;
                return newErrors;
            });
        }
    };

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
        const newErrors = {};

        if (!displayName.trim()) newErrors.displayName = "Display name is required.";
        if (!username.trim()) newErrors.username = "Username is required.";
        if (!password.trim()) newErrors.password = "Password is required.";

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            newErrors.password = "Password must be 8 chars, 1 uppercase, and 1 special symbol.";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email)) newErrors.email = "Valid email is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            return;
        }

        if (errors.username || errors.email) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", displayName);
            formData.append("user_id", username);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("is_active", statusActive);
            formData.append("role", role);

            if (avatarFile) {
                formData.append("profilePic", avatarFile);
            }

            await createUser(formData);
            onClose();
        } catch (error) {
            console.error("Failed to create user", error);
        }
    };

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-sm ${shake ? "shake" : ""}`}
                className="add-user-admin-modal"
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Add user</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button className="btn-only-icon" onClick={onClose}>
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>

                    <Modal.Body className="p-0">
                        <CustomScroll className="add-user-admin-custom-scroll-body" showBottomBlur={false} showTopBlur={false}>
                            {/* Avatar row */}
                            <div className="add-user-avatar-wrapper">
                                <div className="profile-single-box">
                                    <UserAvatar src={avatarUrl} name={displayName} />
                                </div>

                                <div className="d-flex gap-3">
                                    {/* Hidden file input to open the computer's file manager */}
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
                                        onBlur={checkUserIdAvailability}
                                    />
                                </div>
                                {errors.username && (
                                    <div className="invalid-feedback d-block">{errors.username}</div>
                                )}
                            </Form.Group>

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

                            {/* Email */}
                            <Form.Group className="mb-3" controlId="addUserEmail">
                                <Form.Label className="required-star">Email</Form.Label>
                                <div className={`form-control-single-icon${errors.email ? " has-error" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={emailIcon}
                                        alt=""
                                        className="form-left-icon"
                                        width={20}
                                    />
                                    <Form.Control
                                        type="email"
                                        autoComplete="new-password"
                                        placeholder="Enter Email"
                                        className={`custom-form-control h-34${errors.email ? " is-invalid" : ""}`}
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
                                        onBlur={checkEmailAvailability}
                                    />
                                </div>
                                {errors.email && (
                                    <div className="invalid-feedback d-block">{errors.email}</div>
                                )}
                            </Form.Group>

                            {/* Password */}
                            <Form.Group className="mb-3 position-relative" controlId="addUserPassword">
                                <Form.Label className="required-star">Password</Form.Label>
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
                                        placeholder="Enter Password"
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

                            {/* User Status toggle */}
                            <div className="mb-3">
                                <Form.Label className="required-star d-block">User Status</Form.Label>
                                <div className="user-status-box">
                                    <button
                                        role="switch"
                                        aria-checked={statusActive}
                                        aria-label="User status"
                                        className={`add-user-status-toggle${statusActive ? " active" : ""}`}
                                        onClick={() => setStatusActive((s) => !s)}
                                    >
                                        <span className="add-user-status-toggle-knob" />
                                    </button>
                                    <span className="add-user-status-label ">
                                        {statusActive ? "Active" : "Inactive"}
                                    </span>
                                </div>

                            </div>

                            {/* User Role toggle */}
                            <div className="mb-3">
                                <Form.Label className="required-star d-block">User Role</Form.Label>
                                <div className="user-status-box">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={role === "admin"}
                                        aria-label="User role"
                                        className={`add-user-status-toggle${role === "admin" ? " active" : ""}`}
                                        onClick={() => setRole(r => r === "admin" ? "user" : "admin")}
                                    >
                                        <span className="add-user-status-toggle-knob" />
                                    </button>
                                    <span className="add-user-status-label ">
                                        {role === "admin" ? "Admin" : "User"}
                                    </span>
                                </div>
                            </div>

                        </CustomScroll>
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
                        <button className="btn-black btn-lg m-0" onClick={handleSave}>Save</button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default AddUserAdminModal;