// import Modal from "react-bootstrap/Modal";
// import { useState, useRef } from "react";
// import { Form } from "react-bootstrap";
// import InteractiveIcon from "../layout/InteractiveIcon";
// import Tooltip from "../layout/Tooltip";
// import closeIcon from "@images/icon/close-icon.svg";
// import emailIcon from "@images/icon/email.svg";
// import viewIcon from "@images/icon/view.svg";
// import viewHideIcon from "@images/icon/view-hide.svg";
// import passwordIcon from "@images/icon/password.svg";
// import userIcon from "@images/icon/user.svg";
// import uploadeIcon from "@images/icon/uploade-icon.svg";

// import profileDp1 from "@images/svgs/profile/dp-1.svg";
// import profileDp2 from "@images/svgs/profile/dp-2.svg";
// import profileDp3 from "@images/svgs/profile/dp-3.svg";
// import profileDp4 from "@images/svgs/profile/dp-4.svg";
// import profileDp5 from "@images/svgs/profile/dp-5.svg";
// import profileDp6 from "@images/svgs/profile/dp-6.svg";
// import profileDp7 from "@images/svgs/profile/dp-7.svg";
// import profileDp8 from "@images/svgs/profile/dp-8.svg";
// import profileDp9 from "@images/svgs/profile/dp-9.svg";

// const AVATAR_ICONS = [
//     { src: profileDp1, label: "dp-1" },
//     { src: profileDp2, label: "dp-2" },
//     { src: profileDp3, label: "dp-3" },
//     { src: profileDp4, label: "dp-4" },
//     { src: profileDp5, label: "dp-5" },
//     { src: profileDp6, label: "dp-6" },
//     { src: profileDp7, label: "dp-7" },
//     { src: profileDp8, label: "dp-8" },
//     { src: profileDp9, label: "dp-9" },
// ];

// function AddUserAdminModal({ onClose, onSave }) {
//     const [shake, setShake] = useState(false);
//     const modalRef = useRef(null);

//     // Form state
//     const [displayName, setDisplayName] = useState("");
//     const [username, setUsername]       = useState("");
//     const [password, setPassword]       = useState("");
//     const [showPwd, setShowPwd]         = useState(false);
//     const [email, setEmail]             = useState("");
//     const [statusActive, setStatusActive] = useState(true);

//     // Avatar
//     const [selectedIcon, setSelectedIcon] = useState(AVATAR_ICONS[0].src);
//     const [avatarUrl, setAvatarUrl]        = useState(null);
//     const fileInputRef = useRef(null);

//     // Errors
//     const [errors, setErrors] = useState({});

//     const clearErr = (field) =>
//         setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });

//     // Outside click shake
//     const handleOutsideClick = (e) => {
//         if (modalRef.current && !modalRef.current.contains(e.target)) {
//             setShake(true);
//             setTimeout(() => setShake(false), 400);
//         }
//     };

//     // Image upload
//     const handleImageUpload = (e) => {
//         const file = e.target.files[0];
//         if (!file) return;
//         const reader = new FileReader();
//         reader.onload = (ev) => setAvatarUrl(ev.target.result);
//         reader.readAsDataURL(file);
//     };

//     const handleRemoveImage = () => {
//         setAvatarUrl(null);
//         if (fileInputRef.current) fileInputRef.current.value = "";
//     };

//     // Validation & submit
//     const handleSave = () => {
//         const newErrors = {};
//         if (!displayName.trim()) newErrors.displayName = "Display name is required.";
//         if (!username.trim())    newErrors.username    = "Username is required.";
//         if (!password.trim())    newErrors.password    = "Password is required.";
//         const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!email.trim() || !emailRe.test(email)) newErrors.email = "Valid email is required.";

//         if (Object.keys(newErrors).length > 0) {
//             setErrors(newErrors);
//             return;
//         }

//         onSave?.({
//             displayName,
//             username,
//             password,
//             email,
//             status: statusActive ? "active" : "inactive",
//             avatarIcon: selectedIcon,
//             avatarUrl,
//         });
//         onClose();
//     };

//     return (
//         <div onClick={handleOutsideClick}>
//             <Modal
//                 show={true}
//                 backdrop="static"
//                 keyboard={false}
//                 centered
//                 dialogClassName={`modal-dialog-sm ${shake ? "shake" : ""}`}
//                 className="add-user-admin-modal"
//             >
//                 <div ref={modalRef}>
//                     {/* Header */}
//                     <Modal.Header className="border-0">
//                         <Modal.Title>Add user</Modal.Title>
//                         <Tooltip text="Close" offset={8}>
//                             <button className="btn-only-icon" onClick={onClose}>
//                                 <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
//                             </button>
//                         </Tooltip>
//                     </Modal.Header>

//                     <Modal.Body>
//                         {/* Avatar row */}
//                         <div className="add-user-avatar-wrapper">
//                             <div className="add-user-avatar-preview">
//                                 {avatarUrl ? (
//                                     <img src={avatarUrl} alt="Avatar" />
//                                 ) : (
//                                     <InteractiveIcon
//                                         defaultIcon={selectedIcon}
//                                         alt="Selected avatar"
//                                         width={40}
//                                     />
//                                 )}
//                             </div>

//                             <div className="d-flex gap-2">
//                                 <label className="modal-add-new-btn" style={{ cursor: "pointer" }}>
//                                     {/* <input
//                                         ref={fileInputRef}
//                                         type="file"
//                                         accept="image/*"
//                                         style={{ display: "none" }}
//                                         onChange={handleImageUpload}
//                                     /> */}
//                                      <InteractiveIcon
//                                         defaultIcon={uploadeIcon}
//                                         alt="uploade"
//                                         width={24}
//                                     />
//                                      Upload Image
//                                 </label>
//                                 <button className="modal-add-new-btn" onClick={handleRemoveImage}>
//                                     <InteractiveIcon
//                                         defaultIcon={closeIcon}
//                                         alt="close"
//                                         width={24}
//                                     />
//                                     Remove
//                                 </button>
//                             </div>
//                         </div>

//                         {/* Icon picker */}
//                         <div className="add-user-icon-picker">
//                             {AVATAR_ICONS.map((icon) => (
//                                 <button
//                                     key={icon.label}
//                                     title={icon.label}
//                                     aria-label={icon.label}
//                                     className={`add-user-icon-btn ${selectedIcon === icon.src ? "selected" : ""}`}
//                                     onClick={() => setSelectedIcon(icon.src)}
//                                 >
//                                     <InteractiveIcon
//                                         defaultIcon={icon.src}
//                                         alt={icon.label}
//                                         width={40}
//                                     />
//                                 </button>
//                             ))}
//                         </div>

//                         {/* Display Name */}
//                         <Form.Group className="mb-3" controlId="addUserDisplayName">
//                             <Form.Label className="required-star">Display Name</Form.Label>
//                             <div className="form-control-single-icon">
//                                 <InteractiveIcon
//                                     defaultIcon={userIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="text"
//                                     placeholder="Enter Display Name"
//                                     className={`custom-form-control h-34 ${errors.displayName ? "is-invalid" : ""}`}
//                                     value={displayName}
//                                     onChange={(e) => { setDisplayName(e.target.value); clearErr("displayName"); }}
//                                 />

//                             </div>
//                             {errors.displayName && <div className="invalid-feedback">{errors.displayName}</div>}
//                         </Form.Group>

//                         {/* Username */}
//                         <Form.Group className="mb-3" controlId="addUserUsername">
//                             <Form.Label className="required-star">Username / ID</Form.Label>
//                             <div className="form-control-single-icon">
//                                 <InteractiveIcon
//                                     defaultIcon={userIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="text"
//                                     autoComplete="new-password"
//                                     placeholder="Enter Username"
//                                     className={`custom-form-control h-34 ${errors.username ? "is-invalid" : ""}`}
//                                     value={username}
//                                     onChange={(e) => { setUsername(e.target.value); clearErr("username"); }}
//                                 />

//                             </div>
//                              {errors.username && <div className="invalid-feedback">{errors.username}</div>}
//                         </Form.Group>

//                         {/* Password */}
//                         <Form.Group className="mb-3" controlId="addUserPassword">
//                             <Form.Label className="required-star">Password</Form.Label>
//                             <div className="form-control-single-icon">
//                                 <InteractiveIcon
//                                     defaultIcon={passwordIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <InteractiveIcon
//                                     defaultIcon={showPwd ? viewIcon : viewHideIcon}
//                                     alt=""
//                                     className="form-right-icon"
//                                     width={24}
//                                     onClick={() => setShowPwd((p) => !p)}
//                                 />
//                                 <Form.Control
//                                     type={showPwd ? "text" : "password"}
//                                     autoComplete="new-password"
//                                     placeholder="Enter Password"
//                                     className={`custom-form-control h-34 ${errors.password ? "is-invalid" : ""}`}
//                                     value={password}
//                                     onChange={(e) => { setPassword(e.target.value); clearErr("password"); }}
//                                 />

//                             </div>
//                             {errors.password && <div className="invalid-feedback">{errors.password}</div>}
//                         </Form.Group>

//                         {/* Email */}
//                         <Form.Group className="mb-3" controlId="addUserEmail">
//                             <Form.Label className="required-star">Email</Form.Label>
//                             <div className="form-control-single-icon">
//                                 <InteractiveIcon
//                                     defaultIcon={emailIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="email"
//                                     autoComplete="new-password"
//                                     placeholder="Enter Email"
//                                     className={`custom-form-control h-34 ${errors.email ? "is-invalid" : ""}`}
//                                     value={email}
//                                     onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
//                                 />

//                             </div>
//                             {errors.email && <div className="invalid-feedback">{errors.email}</div>}
//                         </Form.Group>

//                         {/* User Status toggle */}
//                         <div className="mb-2">
//                             <Form.Label className="required-star d-block">User Status</Form.Label>
//                             <div className="d-flex align-items-center gap-2">
//                                 <button
//                                     role="switch"
//                                     aria-checked={statusActive}
//                                     aria-label="User status"
//                                     className={`add-user-status-toggle ${statusActive ? "active" : ""}`}
//                                     onClick={() => setStatusActive((s) => !s)}
//                                 >
//                                     <span className="add-user-status-toggle-knob" />
//                                 </button>
//                                 <span className="add-user-status-label">
//                                     {statusActive ? "Active" : "Inactive"}
//                                 </span>
//                             </div>
//                         </div>
//                     </Modal.Body>

//                     {/* Footer */}
//                     <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//                         <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
//                         <button className="btn-black btn-lg m-0" onClick={handleSave}>Save</button>
//                     </Modal.Footer>
//                 </div>
//             </Modal>
//         </div>
//     );
// }

// export default AddUserAdminModal;



// import Modal from "react-bootstrap/Modal";
// import { useState, useRef } from "react";
// import { Form } from "react-bootstrap";
// import InteractiveIcon from "../layout/InteractiveIcon";
// import Tooltip from "../layout/Tooltip";
// import closeIcon from "@images/icon/close-icon.svg";
// import emailIcon from "@images/icon/email.svg";
// import viewIcon from "@images/icon/view.svg";
// import viewHideIcon from "@images/icon/view-hide.svg";
// import passwordIcon from "@images/icon/password.svg";
// import userIcon from "@images/icon/user.svg";
// import uploadeIcon from "@images/icon/uploade-icon.svg";

// import profileDp1 from "@images/svgs/profile/dp-1.svg";
// import profileDp2 from "@images/svgs/profile/dp-2.svg";
// import profileDp3 from "@images/svgs/profile/dp-3.svg";
// import profileDp4 from "@images/svgs/profile/dp-4.svg";
// import profileDp5 from "@images/svgs/profile/dp-5.svg";
// import profileDp6 from "@images/svgs/profile/dp-6.svg";
// import profileDp7 from "@images/svgs/profile/dp-7.svg";
// import profileDp8 from "@images/svgs/profile/dp-8.svg";
// import profileDp9 from "@images/svgs/profile/dp-9.svg";
// import { useAdmin } from "../../context/AdminContext";
// import { formToJSON } from "axios";



// const AVATAR_ICONS = [
//     { src: profileDp1, label: "dp-1" },
//     { src: profileDp2, label: "dp-2" },
//     { src: profileDp3, label: "dp-3" },
//     { src: profileDp4, label: "dp-4" },
//     { src: profileDp5, label: "dp-5" },
//     { src: profileDp6, label: "dp-6" },
//     { src: profileDp7, label: "dp-7" },
//     { src: profileDp8, label: "dp-8" },
//     { src: profileDp9, label: "dp-9" },
// ];

// function AddUserAdminModal({ onClose }) {
//     const [shake, setShake] = useState(false);
//     const modalRef = useRef(null);

//     const { createUser } = useAdmin()

//     // Form state
//     const [displayName, setDisplayName] = useState("");
//     const [username, setUsername] = useState("");
//     const [password, setPassword] = useState("");
//     const [showPwd, setShowPwd] = useState(false);
//     const [email, setEmail] = useState("");
//     const [statusActive, setStatusActive] = useState(true);

//     // Avatar
//     const [selectedIcon, setSelectedIcon] = useState(() => {
//         //  pick a rndom number between 0 and the total icon length
//         const randomIndex = Math.floor(Math.random() * AVATAR_ICONS.length)
//         return AVATAR_ICONS[randomIndex].src
//     });
//     const [avatarUrl, setAvatarUrl] = useState(null);
//     const fileInputRef = useRef(null);

//     // Errors
//     const [errors, setErrors] = useState({});

//     const clearErr = (field) =>
//         setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });

//     // Outside click shake
//     const handleOutsideClick = (e) => {
//         if (modalRef.current && !modalRef.current.contains(e.target)) {
//             setShake(true);
//             setTimeout(() => setShake(false), 400);
//         }
//     };

//     // Image upload
//     const handleImageUpload = (e) => {
//         const file = e.target.files[0];
//         if (!file) return;
//         const reader = new FileReader();
//         reader.onload = (ev) => setAvatarUrl(ev.target.result);
//         reader.readAsDataURL(file);
//     };

//     const handleRemoveImage = () => {
//         setAvatarUrl(null);
//         if (fileInputRef.current) fileInputRef.current.value = "";
//     };



//     // createUser
//     const handleSave = async () => {
//         const newErrors = {};

//         //  if user not enter this field give error here
//         if (!displayName.trim()) newErrors.displayName = "Display name is required.";
//         if (!username.trim()) newErrors.username = "Username is required.";
//         if (!password.trim()) newErrors.password = "Password is required.";


//         // Match the strict backend password rule (1 uppercase, 1 special, 8 chars)
//         const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//         if (!passwordRegex.test(password)) {
//             newErrors.password = "Password must be 8 chars, 1 uppercase, and 1 special symbol.";
//         }
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!email.trim() || !emailRegex.test(email)) newErrors.email = "Valid email is required.";

//         //  if any erro rhere show this in front end
//         if (Object.keys(newErrors).length > 0) {
//             setErrors(newErrors);
//             return;
//         }

//         try {
//             // built here form data t send to backend here
//             const formData = new FormData()
//             formData.append("name", displayName)
//             formData.append("user_id", username)
//             formData.append("email", email)
//             formData.append("password", password)
//             formData.append("is_active", statusActive)

//             //  if user uplaoded image so attch it here
//             if(fileInputRef.current && fileInputRef.current.files[0]){
//                 formData.append("profilePic", fileInputRef.current.files[0])
//             } else {
//                 formData.append("avatarIcon", selectedIcon)
//             }

//             // call the api
//             await createUser(formData)

//             //  close the modal
//             onClose()
//         } catch (error) {
//             console.error("Failed to create user", error);
//         }
//     };

//     return (
//         <div onClick={handleOutsideClick}>
//             <Modal
//                 show={true}
//                 backdrop="static"
//                 keyboard={false}
//                 centered
//                 dialogClassName={`modal-dialog-sm ${shake ? "shake" : ""}`}
//                 className="add-user-admin-modal"
//             >
//                 <div ref={modalRef}>
//                     {/* Header */}
//                     <Modal.Header className="border-0">
//                         <Modal.Title>Add user</Modal.Title>
//                         <Tooltip text="Close" offset={8}>
//                             <button className="btn-only-icon" onClick={onClose}>
//                                 <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
//                             </button>
//                         </Tooltip>
//                     </Modal.Header>

//                     <Modal.Body>
//                         {/* Avatar row */}
//                         <div className="add-user-avatar-wrapper">
//                             <div className="add-user-avatar-preview">
//                                 {avatarUrl ? (
//                                     <img src={avatarUrl} alt="Avatar" />
//                                 ) : (
//                                     <InteractiveIcon
//                                         defaultIcon={selectedIcon}
//                                         alt="Selected avatar"
//                                         width={40}
//                                     />
//                                 )}
//                             </div>

//                             <div className="d-flex gap-2">
//                                 <label className="modal-add-new-btn">
//                                     <input
//                                         ref={fileInputRef}
//                                         type="file"
//                                         accept="image/*"
//                                         className="d-none"
//                                         onChange={handleImageUpload}
//                                     />
//                                     <InteractiveIcon
//                                         defaultIcon={uploadeIcon}
//                                         alt="upload"
//                                         width={22}
//                                     />
//                                     Upload Image
//                                 </label>
//                                 {/* only show remove button when user selected image from the upload */}
//                                 {avatarUrl && (
//                                     <button className="modal-add-new-btn" onClick={handleRemoveImage}>
//                                         <InteractiveIcon
//                                             defaultIcon={closeIcon}
//                                             alt="close"
//                                             width={22}
//                                         />
//                                         Remove
//                                     </button>
//                                 )}

//                             </div>
//                         </div>

//                         {/* Icon picker */}
//                         <div className="add-user-icon-picker">
//                             {AVATAR_ICONS.map((icon) => (
//                                 <button
//                                     key={icon.label}
//                                     title={icon.label}
//                                     aria-label={icon.label}

//                                     // only sho border if ther eis no uplaod image is there
//                                     className={`add-user-icon-btn ${!avatarUrl && selectedIcon === icon.src ? "selected" : ""}`}

//                                     // select this icon and delete user uplaoded image here
//                                     onClick={(e) => {
//                                         e.preventDefault()
//                                         setSelectedIcon(icon.src)
//                                         handleRemoveImage()
//                                     }}
//                                 >
//                                     <InteractiveIcon
//                                         defaultIcon={icon.src}
//                                         alt={icon.label}
//                                         width={40}
//                                     />
//                                 </button>
//                             ))}
//                         </div>


//                         {/* Username */}
//                         <Form.Group className="mb-3" controlId="addUserUsername">
//                             <Form.Label className="required-star">Username / ID</Form.Label>
//                             <div className={`form-control-single-icon${errors.username ? " has-error" : ""}`}>
//                                 <InteractiveIcon
//                                     defaultIcon={userIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="text"
//                                     autoComplete="new-password"
//                                     placeholder="Enter Username"
//                                     className={`custom-form-control h-34${errors.username ? " is-invalid" : ""}`}
//                                     value={username}
//                                     onChange={(e) => { setUsername(e.target.value); clearErr("username"); }}
//                                 />

//                             </div>
//                             {errors.username && (
//                                 <div className="invalid-feedback d-block">{errors.username}</div>
//                             )}
//                         </Form.Group>
//                         {/* Display Name */}
//                         <Form.Group className="mb-3" controlId="addUserDisplayName">
//                             <Form.Label className="required-star">Display Name</Form.Label>
//                             {/* FIX: has-error wrapper — Bootstrap invalid-feedback needs position relative parent */}
//                             <div className={`form-control-single-icon${errors.displayName ? " has-error" : ""}`}>
//                                 <InteractiveIcon
//                                     defaultIcon={userIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="text"
//                                     placeholder="Enter Display Name"
//                                     className={`custom-form-control h-34${errors.displayName ? " is-invalid" : ""}`}
//                                     value={displayName}
//                                     onChange={(e) => { setDisplayName(e.target.value); clearErr("displayName"); }}
//                                 />

//                             </div>
//                             {errors.displayName && (
//                                 <div className="invalid-feedback d-block">{errors.displayName}</div>
//                             )}
//                         </Form.Group>

//                         {/* Email */}
//                         <Form.Group className="mb-3" controlId="addUserEmail">
//                             <Form.Label className="required-star">Email</Form.Label>
//                             <div className={`form-control-single-icon${errors.email ? " has-error" : ""}`}>
//                                 <InteractiveIcon
//                                     defaultIcon={emailIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     type="email"
//                                     autoComplete="new-password"
//                                     placeholder="Enter Email"
//                                     className={`custom-form-control h-34${errors.email ? " is-invalid" : ""}`}
//                                     value={email}
//                                     onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
//                                 />

//                             </div>
//                             {errors.email && (
//                                 <div className="invalid-feedback d-block">{errors.email}</div>
//                             )}
//                         </Form.Group>

//                         {/* Password */}
//                         <Form.Group className="mb-3" controlId="addUserPassword">
//                             <Form.Label className="required-star">Password</Form.Label>
//                             <div className={`form-control-single-icon${errors.password ? " has-error" : ""}`}>
//                                 <InteractiveIcon
//                                     defaultIcon={passwordIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <InteractiveIcon
//                                     defaultIcon={showPwd ? viewIcon : viewHideIcon}
//                                     alt=""
//                                     className="form-right-icon"
//                                     width={24}
//                                     onClick={() => setShowPwd((p) => !p)}
//                                 />
//                                 <Form.Control
//                                     type={showPwd ? "text" : "password"}
//                                     autoComplete="new-password"
//                                     placeholder="Enter Password"
//                                     className={`custom-form-control h-34${errors.password ? " is-invalid" : ""}`}
//                                     value={password}
//                                     onChange={(e) => { setPassword(e.target.value); clearErr("password"); }}
//                                 />

//                             </div>
//                             {errors.password && (
//                                 <div className="invalid-feedback d-block">{errors.password}</div>
//                             )}
//                         </Form.Group>

//                         {/* User Status toggle */}
//                         <div className="mb-2">
//                             <Form.Label className="required-star d-block">User Status</Form.Label>
//                             <div className="d-flex align-items-center gap-2">
//                                 <button
//                                     role="switch"
//                                     aria-checked={statusActive}
//                                     aria-label="User status"
//                                     className={`add-user-status-toggle${statusActive ? " active" : ""}`}
//                                     onClick={() => setStatusActive((s) => !s)}
//                                 >
//                                     <span className="add-user-status-toggle-knob" />
//                                 </button>
//                                 <span className="add-user-status-label">
//                                     {statusActive ? "Active" : "Inactive"}
//                                 </span>
//                             </div>
//                         </div>
//                     </Modal.Body>

//                     {/* Footer */}
//                     <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//                         <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
//                         <button className="btn-black btn-lg m-0" onClick={handleSave}>Save</button>
//                     </Modal.Footer>
//                 </div>
//             </Modal>
//         </div>
//     );
// }

// export default AddUserAdminModal;


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

function AddUserAdminModal({ onClose, setModal }) {
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const { createUser } = useAdmin();

    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState("");
    const [statusActive, setStatusActive] = useState(true);

    const [avatarUrl, setAvatarUrl] = useState(null);
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
            setErrors(newErrors);
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", displayName);
            formData.append("user_id", username);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("is_active", statusActive);

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

                    <Modal.Body>
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
                        <Form.Group className="mb-3" controlId="addUserPassword">
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