import { useRef, useState } from "react";
import { Form, Dropdown } from "react-bootstrap";
import InteractiveIcon from "../layout/InteractiveIcon";
import CustomSelect from "../layout/CustomSelect";

import passwordIcon from "@images/icon/password.svg";
import publicLinkIcon from "@images/icon/public-link.svg";
import arrowDownIcon from "@images/icon/arrow-down.svg";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
import copyIcon from "@images/icon/copy.svg";
import copiedIcon from "@images/icon/copied-icon.svg"
import { useNotification } from "../../context/NotificationContext";
import Tooltip from "../layout/Tooltip";

const expiryDayOption = [
    // { value: "2m", label: "2 Minutes (Test)" },
    { value: "1", label: "1 Day" },
    { value: "7", label: "7 Day" },
    { value: "30", label: "30 Day" },
];

function CopyLinkSection({
    accessType,
    setAccessType,
    expiryDay,
    setExpiryDay,
    linkExpiry,
    setLinkExpiry,
    passwordProtect,
    setPasswordProtect,
    password,
    setPassword,
    savedPassword,
    setSavedPassword,
    passwordShow,
    setPasswordShow,
    isFocused,
    setIsFocused,
    passwordError,
    setPasswordError,
    canShare,
    isMobile,
    saveLinkSettings,
    existingLinkInfo
}) {
    const mobileToggleRef = useRef(null);
    const desktopToggleRef = useRef(null);

    const [pwdCopied, setPwdCopied] = useState(false);

    const { showNotification } = useNotification()

    // Helper to generate a random 8-character password
    const generateRandomPassword = () => {
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const special = "!@#$%^&*?";

        let pass = "";
        pass += uppercase[Math.floor(Math.random() * uppercase.length)];
        pass += lowercase[Math.floor(Math.random() * lowercase.length)];
        pass += numbers[Math.floor(Math.random() * numbers.length)];
        pass += special[Math.floor(Math.random() * special.length)];

        const allChars = uppercase + lowercase + numbers + special;
        for (let i = 4; i < 8; i++) {
            pass += allChars[Math.floor(Math.random() * allChars.length)];
        }

        setPassword(pass);
        setPasswordError(false);
        if (!passwordProtect) setPasswordProtect(true);

    };

    const handlePasswordProtectToggle = () => {
        if (!passwordProtect) {
            setPasswordProtect(true);
            setPassword("");
            setPasswordError(false);
        } else {
            setPassword("");
            setSavedPassword("");
            setPasswordError(false);
            setPasswordProtect(false);
            if (existingLinkInfo) {
                saveLinkSettings({ passwordProtect: false, password: "" });
            }
        }
    };


    //  when user click on the copy password icon
    const handleCopyPassword = async () => {
        if (!password) return
        try {
            await navigator.clipboard.writeText(password);
            setPwdCopied(true);
            setTimeout(() => setPwdCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy password:", err);
        }
    }

    return (
        <>
            {/* create link for MOBILE */}
            {isMobile ? (
                <div className="create-link-section create-link-section-mobile" style={{ pointerEvents: !canShare ? 'none' : 'auto', opacity: !canShare ? 0.6 : 1 }}>
                    <div className="create-link-section-header">
                        <h3 className="modal-title-sub">Create Link</h3>
                    </div>

                    {/* Access Type */}
                    <div className="create-link-items">
                        <div className="access-single-box">
                            <div className="access-single-wrapper">
                                <div className={`access-single-icon ${accessType === "public" ? "public-link" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={accessType === "public" ? publicLinkIcon : passwordIcon}
                                        width={24}
                                        alt=""
                                    />
                                </div>
                                <div className="access-single-contetn">
                                    <div className="access-single-dropdown-box">
                                        <span
                                            className="access-single-name"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => mobileToggleRef.current?.click()}
                                        >
                                            {accessType === "restricted" ? "People with access" : "Public link"}
                                        </span>
                                        <Dropdown className="magic-dropdown dropdown-no-arrow">
                                            <Dropdown.Toggle ref={mobileToggleRef} as="div" className="magic-dropdown__toggle">
                                                <span className="magic-dropdown__chevron-wrapper">
                                                    <InteractiveIcon
                                                        defaultIcon={arrowDownIcon}
                                                        width={20}
                                                        alt=""
                                                        className="magic-dropdown__chevron-icon"
                                                    />
                                                </span>
                                            </Dropdown.Toggle>

                                            <Dropdown.Menu align="start" className="magic-dropdown__menu">
                                                {accessType !== "restricted" && (
                                                    <Dropdown.Item
                                                        className="magic-dropdown__item"
                                                        onClick={() => {
                                                            setAccessType("restricted");
                                                            if (existingLinkInfo) saveLinkSettings({ accessType: "restricted" });
                                                        }}
                                                    >
                                                        People with access
                                                    </Dropdown.Item>
                                                )}
                                                {accessType !== "public" && (
                                                    <Dropdown.Item
                                                        className="magic-dropdown__item"
                                                        onClick={() => {
                                                            setAccessType("public");
                                                            if (existingLinkInfo) saveLinkSettings({ accessType: "public" });
                                                        }}
                                                    >
                                                        Public link
                                                    </Dropdown.Item>
                                                )}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                    <span className="access-single-sun-name">
                                        {accessType === "restricted"
                                            ? "People listed above have access."
                                            : "Anyone with the link."}
                                    </span>
                                </div>
                            </div>
                            {accessType === "public" && (
                                <p className="modal-tag">View & Download</p>
                            )}
                        </div>
                    </div>

                    {/* Link Expiration Section */}
                    {accessType === "public" && (
                        <div className={`create-link-items ${linkExpiry ? "" : "disable"}`}>
                            <div className="create-link-items-content">
                                <div className="form-check-group m-0">
                                    <label htmlFor="Link-expirtation" style={{ cursor: 'pointer' }}>
                                        <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                    </label>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        id="Link-expirtation"
                                        checked={linkExpiry}
                                        onChange={() => {
                                            const newExpiryState = !linkExpiry;
                                            const newExpiryDay = newExpiryState ? expiryDayOption[0] : null;
                                            setExpiryDay(newExpiryDay);
                                            setLinkExpiry(newExpiryState);
                                            if (existingLinkInfo) {
                                                saveLinkSettings({ linkExpiry: newExpiryState, expiryDay: newExpiryDay });
                                            }
                                        }}
                                    />
                                    <span
                                        className='form-label m-0'
                                        onClick={() => {
                                            const newExpiryState = !linkExpiry;
                                            const newExpiryDay = newExpiryState ? expiryDayOption[0] : null;
                                            setExpiryDay(newExpiryDay);
                                            setLinkExpiry(newExpiryState);
                                            if (existingLinkInfo) {
                                                saveLinkSettings({ linkExpiry: newExpiryState, expiryDay: newExpiryDay });
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Link expirtation
                                    </span>
                                </div>

                                <div className="link-expirtation-day" onClick={(e) => e.stopPropagation()}>
                                    {!linkExpiry ? (
                                        <p className="modal-tag">No expiration</p>
                                    ) : (
                                        <Form.Group className="mb-0">
                                            <CustomSelect
                                                options={expiryDayOption}
                                                value={expiryDay}
                                                onChange={(val) => {
                                                    setExpiryDay(val);
                                                    if (existingLinkInfo) saveLinkSettings({ expiryDay: val });
                                                }}
                                                placeholder="No expiration"
                                                showIndicatorSeparator={false}
                                                isSearchable={false}
                                                className="expiry-select"
                                            />
                                        </Form.Group>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Protect Section */}
                    {accessType === "public" && (
                        <div className={`create-link-items ${passwordProtect ? "" : "disable"}`}>
                            <div className="create-link-items-content">
                                <div className="form-check-group m-0">
                                    <label htmlFor="password-protect" style={{ cursor: 'pointer' }}>
                                        <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                    </label>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        id="password-protect"
                                        checked={passwordProtect}
                                        onChange={handlePasswordProtectToggle}
                                    />
                                    <span
                                        className='form-label m-0'
                                        onClick={handlePasswordProtectToggle}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Password protect
                                    </span>
                                </div>
                            </div>
                            <div className="link-expirtation-day" onClick={(e) => e.stopPropagation()}>
                                {!passwordProtect ? (
                                    <p className="modal-tag d-none">No password</p>
                                ) : (
                                    <>
                                        <Form.Group className="mb-0 position-relative" controlId="shareLinkPasswordGroup">
                                            {/* Dummy decoy input to trick Chrome autofill */}
                                            <input type="password" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="new-password" />
                                            {password.length > 0 && (() => {
                                                const checks = [
                                                    /[A-Z]/.test(password),
                                                    /[a-z]/.test(password),
                                                    /[0-9]/.test(password),
                                                    /[!@#$%^&*?]/.test(password),
                                                    password.length >= 8,
                                                ];
                                                const allPassed = checks.every(Boolean);

                                                return (
                                                    <>
                                                        {!allPassed && isFocused && (
                                                            <div className="pwd-requirements-box">
                                                                <p className="pwd-req-title">Password requirements</p>
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
                                                    </>
                                                );
                                            })()}

                                            <div className={`form-control-single-icon${passwordError ? " has-error" : ""}`}>
                                                <InteractiveIcon
                                                    defaultIcon={passwordShow ? viewIcon : viewHideIcon}
                                                    alt=""
                                                    className="form-right-icon"
                                                    width={24}
                                                    onClick={() => setPasswordShow(!passwordShow)}
                                                />
                                                <Form.Control
                                                    type={passwordShow ? "text" : "password"}
                                                    name="share_link_password_input"
                                                    autoComplete="new-password"
                                                    className={`custom-form-control h-34${passwordError ? " is-invalid" : ""}`}
                                                    value={password}
                                                    placeholder="Enter your password"
                                                    onChange={(e) => {
                                                        setPassword(e.target.value);
                                                        setPasswordError(false);
                                                    }}
                                                    onFocus={() => setIsFocused(true)}
                                                    onBlur={() => setIsFocused(false)}
                                                />
                                                {!passwordError && password.length > 0 && (() => {
                                                    const checks = [
                                                        /[A-Z]/.test(password),
                                                        /[a-z]/.test(password),
                                                        /[0-9]/.test(password),
                                                        /[!@#$%^&*?]/.test(password),
                                                        password.length >= 8,
                                                    ];
                                                    const passed = checks.filter(Boolean).length;
                                                    const strengthClass = passed <= 2 ? "weak" : passed <= 4 ? "medium" : "strong";
                                                    return (
                                                        <div className="pwd-strength-bar-wrapper">
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`pwd-strength-bar-segment ${i <= passed ? strengthClass : ""}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {passwordError && (
                                                <p className="text-danger small mt-1 mb-0" style={{ fontSize: "12px", color: "#dc3545" }}>
                                                    {!password
                                                        ? "Please enter a password"
                                                        : "Please click 'Set password' to save your password"}
                                                </p>
                                            )}
                                        </Form.Group>

                                        <button className="btn-black btn-lg m-0" type="button" onClick={generateRandomPassword}>
                                            Generate
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* create link for DESKTOP */
                <div className="create-link-section" style={{ pointerEvents: !canShare ? 'none' : 'auto', opacity: !canShare ? 0.6 : 1 }}>
                    <div className="create-link-section-header">
                        <h3 className="modal-title-sub">Create Link</h3>
                    </div>

                    {/* Access Type */}
                    <div className="create-link-items">
                        <div className="access-single-box">
                            <div className="access-single-wrapper">
                                <div className={`access-single-icon ${accessType === "public" ? "public-link" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={accessType === "public" ? publicLinkIcon : passwordIcon}
                                        width={24}
                                        alt=""
                                    />
                                </div>
                                <div className="access-single-contetn">
                                    <div className="access-single-dropdown-box">
                                        <span
                                            className="access-single-name"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => desktopToggleRef.current?.click()}
                                        >
                                            {accessType === "restricted" ? "People with access" : "Public link"}
                                        </span>
                                        <Dropdown className="magic-dropdown dropdown-no-arrow">
                                            <Dropdown.Toggle ref={desktopToggleRef} as="div" className="magic-dropdown__toggle">
                                                <span className="magic-dropdown__chevron-wrapper">
                                                    <InteractiveIcon
                                                        defaultIcon={arrowDownIcon}
                                                        width={20}
                                                        alt=""
                                                        className="magic-dropdown__chevron-icon"
                                                    />
                                                </span>
                                            </Dropdown.Toggle>

                                            <Dropdown.Menu align="start" className="magic-dropdown__menu">
                                                {accessType !== "restricted" && (
                                                    <Dropdown.Item
                                                        className="magic-dropdown__item"
                                                        onClick={() => {
                                                            setAccessType("restricted");
                                                            if (existingLinkInfo) saveLinkSettings({ accessType: "restricted" });
                                                        }}
                                                    >
                                                        People with access
                                                    </Dropdown.Item>
                                                )}
                                                {accessType !== "public" && (
                                                    <Dropdown.Item
                                                        className="magic-dropdown__item"
                                                        onClick={() => {
                                                            setAccessType("public");
                                                            if (existingLinkInfo) saveLinkSettings({ accessType: "public" });
                                                        }}
                                                    >
                                                        Public link
                                                    </Dropdown.Item>
                                                )}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                    <span className="access-single-sun-name">
                                        {accessType === "restricted"
                                            ? "People listed above have access."
                                            : "Anyone with the link."}
                                    </span>
                                </div>
                            </div>
                            {accessType === "public" && (
                                <p className="modal-tag">View & Download</p>
                            )}
                        </div>
                    </div>

                    {/* Link Expiration Section */}
                    {accessType === "public" && (
                        <div className={`create-link-items ${linkExpiry ? "" : "disable"}`}>
                            <div className="create-link-items-content">
                                <div className="form-check-group m-0">
                                    <label htmlFor="Link-expirtation" style={{ cursor: 'pointer' }}>
                                        <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                    </label>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        id="Link-expirtation"
                                        checked={linkExpiry}
                                        onChange={() => {
                                            const newExpiryState = !linkExpiry;
                                            const newExpiryDay = newExpiryState ? expiryDayOption[0] : null;
                                            setExpiryDay(newExpiryDay);
                                            setLinkExpiry(newExpiryState);
                                            if (existingLinkInfo) {
                                                saveLinkSettings({ linkExpiry: newExpiryState, expiryDay: newExpiryDay });
                                            }
                                        }}
                                    />
                                    <span
                                        className='form-label m-0'
                                        onClick={() => {
                                            const newExpiryState = !linkExpiry;
                                            const newExpiryDay = newExpiryState ? expiryDayOption[0] : null;
                                            setExpiryDay(newExpiryDay);
                                            setLinkExpiry(newExpiryState);
                                            if (existingLinkInfo) {
                                                saveLinkSettings({ linkExpiry: newExpiryState, expiryDay: newExpiryDay });
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Link expirtation
                                    </span>
                                </div>

                                <div className="link-expirtation-day" onClick={(e) => e.stopPropagation()}>
                                    {!linkExpiry ? (
                                        <p className="modal-tag">No expiration</p>
                                    ) : (
                                        <Form.Group className="mb-0">
                                            <CustomSelect
                                                options={expiryDayOption}
                                                value={expiryDay}
                                                onChange={(val) => {
                                                    setExpiryDay(val);
                                                    if (existingLinkInfo) saveLinkSettings({ expiryDay: val });
                                                }}
                                                placeholder="No expiration"
                                                showIndicatorSeparator={false}
                                                isSearchable={false}
                                                className="expiry-select"
                                            />
                                        </Form.Group>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Protect Section */}
                    {accessType === "public" && (
                        <div className={`create-link-items ${passwordProtect ? "" : "disable"}`}>
                            <div className="create-link-items-content generate-password-section-shear-link">
                                <div className="password-protect-section-box">
                                    <div className="form-check-group m-0">
                                        <label htmlFor="password-protect" style={{ cursor: 'pointer' }}>
                                            <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                        </label>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            id="password-protect"
                                            checked={passwordProtect}
                                            onChange={handlePasswordProtectToggle}
                                        />
                                        <span
                                            className='form-label m-0'
                                            onClick={handlePasswordProtectToggle}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Password protect
                                        </span>
                                    </div>
                                    {passwordProtect && (
                                        <button className="generate-btn" type="button" onClick={generateRandomPassword}>
                                            Generate
                                        </button>
                                    )}

                                </div>
                                {passwordProtect && (
                                    <div className="link-expirtation-day w-100 align-items-start" onClick={(e) => e.stopPropagation()}>



                                        <>
                                            <Form.Group className="mb-0 position-relative w-100" controlId="shareLinkPasswordGroup">
                                                {/* Dummy decoy input to trick Chrome autofill */}
                                                <input type="password" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="new-password" />
                                                {password.length > 0 && (() => {
                                                    const checks = [
                                                        /[A-Z]/.test(password),
                                                        /[a-z]/.test(password),
                                                        /[0-9]/.test(password),
                                                        /[!@#$%^&*?]/.test(password),
                                                        password.length >= 8,
                                                    ];
                                                    const allPassed = checks.every(Boolean);

                                                    return (
                                                        <>
                                                            {!allPassed && isFocused && (
                                                                <div className="pwd-requirements-box">
                                                                    <p className="pwd-req-title">Password requirements</p>
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
                                                        </>
                                                    );
                                                })()}

                                                <div className={`form-control-single-icon${passwordError ? " has-error" : ""}`}>
                                                    {password && (
                                                        <Tooltip text="Copy Password" >
                                                            <InteractiveIcon
                                                                defaultIcon={pwdCopied ? copiedIcon : copyIcon}
                                                                alt="Copy"
                                                                className="form-right-icon"
                                                                width={18}
                                                                onClick={handleCopyPassword}
                                                                style={{ right: "36px" }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip text={passwordShow ? "Hide Password" : "View Password"} >
                                                        <InteractiveIcon
                                                            defaultIcon={passwordShow ? viewIcon : viewHideIcon}
                                                            alt=""
                                                            className="form-right-icon"
                                                            width={24}
                                                            onClick={() => setPasswordShow(!passwordShow)}
                                                            style={{ zIndex: 10 }}
                                                        />
                                                    </Tooltip>
                                                    <Form.Control
                                                        style={{ paddingRight: password ? "60px" : "36px" }}
                                                        type={passwordShow ? "text" : "password"}
                                                        name="share_link_password_input"
                                                        autoComplete="new-password"
                                                        className={`custom-form-control h-34${passwordError ? " is-invalid" : ""}`}
                                                        value={password}
                                                        placeholder="Enter your password"
                                                        onChange={(e) => {
                                                            setPassword(e.target.value);
                                                            setPasswordError(false);
                                                        }}
                                                        onFocus={() => setIsFocused(true)}
                                                        onBlur={() => setIsFocused(false)}
                                                    />
                                                </div>
                                                {passwordError && (
                                                    <p className="text-danger small mt-1 mb-0" style={{ fontSize: "12px", color: "#dc3545" }}>
                                                        {!password
                                                            ? "Please enter a password"
                                                            : "Please click 'Set password' to save your password"}
                                                    </p>
                                                )}

                                                {!passwordError && password.length > 0 && (() => {
                                                    const checks = [
                                                        /[A-Z]/.test(password),
                                                        /[a-z]/.test(password),
                                                        /[0-9]/.test(password),
                                                        /[!@#$%^&*?]/.test(password),
                                                        password.length >= 8,
                                                    ];
                                                    const passed = checks.filter(Boolean).length;
                                                    const strengthClass = passed <= 2 ? "weak" : passed <= 4 ? "medium" : "strong";
                                                    return (
                                                        <div className="pwd-strength-bar-wrapper">
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`pwd-strength-bar-segment ${i <= passed ? strengthClass : ""}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </Form.Group>
                                            <button className="btn-black btn-lg m-0" type="button"
                                                onClick={() => {
                                                    if (!password) {
                                                        setPasswordError(true)
                                                        return
                                                    };
                                                    setSavedPassword(password);
                                                    setPasswordProtect(true);
                                                    setPasswordError(false);
                                                    if (existingLinkInfo) {
                                                        saveLinkSettings({ passwordProtect: true, password });
                                                    }
                                                }}
                                            >
                                                Set password
                                            </button>


                                        </>

                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default CopyLinkSection;
