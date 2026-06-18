import Modal from "react-bootstrap/Modal";
import { useState, useRef } from "react";
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

function ViewAdminModal({ onClose, setModal, data }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const { createUser } = useAdmin();

    const [displayName, setDisplayName] = useState(data?.name || "");
    const [username, setUsername] = useState(data?.user_id || "");
    const [email, setEmail] = useState(data?.email || "");
    const [statusActive, setStatusActive] = useState(data?.is_active ?? true);
    const [avatarUrl, setAvatarUrl] = useState(data?.thumbnail_profile_pic || data?.compressed_profile_pic || data?.profilePic || null);

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




    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-sm ${shake ? "shake" : ""}`}
                className="add-user-admin-modal view-admin-modal"
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>View user details</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button className="btn-only-icon" onClick={onClose}>
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>

                    <Modal.Body>
                        {/* Avatar row */}
                        <div className="add-user-avatar-wrapper">
                            <div className="profile-single-box">
                                <UserAvatar src={avatarUrl} name={displayName} />
                                <h3 className="modal-title-sub">Profile picture</h3>
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
                                />
                            </div>
                            {errors.email && (
                                <div className="invalid-feedback d-block">{errors.email}</div>
                            )}
                        </Form.Group>

                        {/* Password */}
                       

                        {/* User Status toggle */}
                        <div className="mb-3">
                            <Form.Label className="required-star d-block">User Status</Form.Label>
                            <div className="user-status-box">
                                <button
                                    role="switch"
                                    aria-checked={statusActive}
                                    aria-label="User status"
                                    className={`add-user-status-toggle${statusActive ? " active" : ""}`}
                                >
                                    <span className="add-user-status-toggle-knob" />
                                </button>
                                <span className="add-user-status-label ">
                                    {statusActive ? "Active" : "Inactive"}
                                </span>                                
                            </div>
                        </div>
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
                        <button className="btn-black btn-lg m-0" >Save</button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default ViewAdminModal;