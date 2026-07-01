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
import UserAvatar from "../layout/UserAvatar";
import CustomScroll from "../layout/CustomScroll";
import singleUserIcon from "@images/icon/single-user-icon.svg";


function EditAdminModal({ onClose, setModal, data }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const { updateUser } = useAdmin();


    const [displayName, setDisplayName] = useState(data?.name || "");
    const [username, setUsername] = useState(data?.user_id || "");
    const [email, setEmail] = useState(data?.email || "");
    const [password, setPassword] = useState("••••••••");
    const [statusActive, setStatusActive] = useState(data?.is_active ?? true);
    const [role, setRole] = useState(data?.role || "user");
    const [avatarUrl, setAvatarUrl] = useState(data?.thumbnail_profile_pic || data?.compressed_profile_pic || data?.profilePic || null);

    //  when modal first appear so password field is disabled here
    const [isPasswordLocked, setIsPasswordLocked] = useState(true);
    const [showPwd, setShowPwd] = useState(false);
    const [pwdTouched, setPwdTouched] = useState(false);


    // live password requirement checks - recalculates whenever `password` changes
    const checks = useMemo(() => [
        /[A-Z]/.test(password),           // checks[0] - uppercase
        /[a-z]/.test(password),           // checks[1] - lowercase
        /\d/.test(password),              // checks[2] - number
        /[@$!%*?&]/.test(password),       // checks[3] - special char
        password.length >= 8,             // checks[4] - min length
    ], [password]);

    const fileInputRef = useRef(null);

    const [errors, setErrors] = useState({});

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
        const newErrors = {};

        //  dispaly error if field here is not matched
        if (!displayName.trim()) newErrors.displayName = "Display name is required.";
        if (!username.trim()) newErrors.username = "Username is required.";

        if (!isPasswordLocked) {
            //  is user not entered the password here
            if (!password.trim()) newErrors.password = "Password is required"

            //  checking here the password regex 
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                newErrors.password = "Password must be 8 chars, 1 uppercase, and 1 special symbol.";
            }
        }


        //  email regex here
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email)) newErrors.email = "Valid email is required"

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            //  build the form data to send to backend here
            const formData = new FormData()
            formData.append("name", displayName)
            formData.append("user_id", username)
            formData.append("email", email)
            formData.append("is_active", statusActive)

            //  only send password here if they have unlock the password field from reset password
            if (!isPasswordLocked) {
                formData.append("password", password)
            }

            if (role !== data?.role) {
                formData.append("role", role)
            }

            // attach new profile pic if upladoed here
            if (avatarFile) {
                formData.append("profilePic", avatarFile)
            }

            // call the update user api here
            await updateUser(data._id, formData)

            //  close the modal here
            onClose()

        } catch (error) {
            console.error("Failed to update user", error);
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
                className="add-user-admin-modal edit-user-details-modal"
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Edit user details</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button className="btn-only-icon" onClick={onClose}>
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>

                    <Modal.Body className="p-0">
                        <CustomScroll className="edit-user-details-custom-scroll-body" showBottomBlur={false} showTopBlur={false}>
                            {/* Avatar row */}
                            <div className="add-user-avatar-wrapper">
                                <div className="profile-single-box">
                                    <UserAvatar user={data} src={avatarUrl} name={displayName} />
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
                                        defaultIcon={singleUserIcon}
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

                            {/* Display Name */}
                            <Form.Group className="mb-3" controlId="addUserDisplayName">
                                <Form.Label className="required-star">Display Name</Form.Label>
                                <div className={`form-control-single-icon${errors.displayName ? " has-error" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={singleUserIcon}
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
                                    />
                                </div>
                                {errors.email && (
                                    <div className="invalid-feedback d-block">{errors.email}</div>
                                )}
                            </Form.Group>

                            {/* Password */}
                            <Form.Group className="mb-3" controlId="addUserPassword">

                                <Form.Label className=" form-label d-flex align-items-center justify-content-between">
                                    <span className="required-star">Password</span>
                                    {isPasswordLocked && (
                                        <span
                                            className="clear-btn"
                                            onClick={() => { setIsPasswordLocked(false); setPassword(""); setPwdTouched(false); }}
                                        >
                                            Reset Password
                                        </span>
                                    )}
                                </Form.Label>


                                {/* Dynamically adding the 'disabled' class here! */}
                                <div className={`form-control-single-icon${errors.password ? " has-error" : ""}${isPasswordLocked ? " disabled" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={passwordIcon}
                                        alt=""
                                        className={`form-left-icon${isPasswordLocked ? " disabled-icon" : ""}`}
                                        width={20}
                                    />

                                    {!isPasswordLocked && (
                                        <InteractiveIcon
                                            defaultIcon={showPwd ? viewIcon : viewHideIcon}
                                            alt=""
                                            className="form-right-icon"
                                            width={24}
                                            onClick={() => setShowPwd((p) => !p)}
                                        />
                                    )}

                                    <Form.Control
                                        type={showPwd && !isPasswordLocked ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="Enter Password"
                                        disabled={isPasswordLocked}
                                        className={`custom-form-control h-34${errors.password ? " is-invalid" : ""}`}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            clearErr("password");
                                            if (!pwdTouched) setPwdTouched(true);
                                        }}
                                    />
                                </div>
                                {!isPasswordLocked && password.length > 0 && (
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
                            </Form.Group>

                            {/* User Status radio card */}
                            <div className="mb-4">
                                <Form.Label className="required-star d-block">User Status</Form.Label>
                                <div className="custom-radio-card-wrapper only-radio-btn">
                                    <label className={`custom-radio-card ${statusActive ? "active" : ""}`}>
                                        <input
                                            type="radio"
                                            name="userStatus"
                                            value="active"
                                            checked={statusActive}
                                            onChange={() => setStatusActive(true)}
                                            className="rounded-checkbox"
                                        />
                                        <div>
                                            <div className="subtitle m-0">Active</div>
                                        </div>
                                    </label>
                                    <label className={`custom-radio-card ${!statusActive ? "active" : ""}`}>
                                        <input
                                            type="radio"
                                            name="userStatus"
                                            value="inactive"
                                            checked={!statusActive}
                                            onChange={() => setStatusActive(false)}
                                            className="rounded-checkbox"
                                        />
                                        <div>
                                            <div className="subtitle m-0">Inactive</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            {/* User Role radio card */}
                            <div className="mb-3">
                                <Form.Label className="required-star d-block">User Role</Form.Label>
                                <div className="custom-radio-card-wrapper only-radio-btn">
                                    <label className={`custom-radio-card ${role === "user" ? "active" : ""}`}>
                                        <input
                                            type="radio"
                                            name="userRole"
                                            value="user"
                                            checked={role === "user"}
                                            onChange={() => setRole("user")}
                                            className="rounded-checkbox"
                                        />
                                        <div>
                                            <div className="subtitle m-0">User</div>
                                        </div>
                                    </label>
                                    <label className={`custom-radio-card ${role === "admin" ? "active" : ""}`}>
                                        <input
                                            type="radio"
                                            name="userRole"
                                            value="admin"
                                            checked={role === "admin"}
                                            onChange={() => setRole("admin")}
                                            className="rounded-checkbox"
                                        />
                                        <div>
                                            <div className="subtitle m-0">Admin</div>
                                        </div>
                                    </label>
                                    
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

export default EditAdminModal;