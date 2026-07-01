import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, data } from "react-router-dom";
import { Form } from 'react-bootstrap';
import axiosApi from "../../utils/api.js";
import { useNotification } from "../../context/NotificationContext";
import InteractiveIcon from "../layout/InteractiveIcon";

// Main Icons
import BrandSmallIcon from "@images/small-logo.svg";
import passwordIcon from "@images/icon/password.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
// Background animated icons matching Login.jsx
import listFolder1Icon from "@images/svgs/list/SF1.svg";
import listFolder2Icon from "@images/svgs/list/SF2.svg";
import listFolder3Icon from "@images/svgs/list/SF3.svg";
import gridFolder1Icon from "@images/svgs/grid/F1.svg";
import gridFolder2Icon from "@images/svgs/grid/F2.svg";
import gridFolder3Icon from "@images/svgs/grid/F3.svg";
import listFolderUser1Icon from "@images/svgs/list/SF1s.svg";
import listFolderUser2Icon from "@images/svgs/list/SF2s.svg";
import listFolderUser3Icon from "@images/svgs/list/SF3s.svg";
import gridFolderUser1Icon from "@images/svgs/grid/F1s.svg";
import gridFolderUser2Icon from "@images/svgs/grid/F2s.svg";
import gridFolderUser3Icon from "@images/svgs/grid/F3s.svg";
import videoFile from "@images/svgs/media/video-file.svg";
import imgFile from "@images/svgs/media/img-file.svg";
import pdfFile from "@images/svgs/media/pdf-file.svg";
import zipFile from "@images/svgs/media/zip-file.svg";



function ResetPassword() {
    const { showNotification } = useNotification()

    const { token } = useParams()
    const navigate = useNavigate()

    //  password field state here
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);


    //  first check if token is valid or not if not then shwo error message here
    const [tokenLoading, setTokenLoading] = useState(true)
    const [tokenError, setTokenError] = useState(false)

    // Live password complexity checks (matches EditAdminModal.jsx requirements)
    const checks = useMemo(() => [
        /[A-Z]/.test(password),           // 0: At least one uppercase letter
        /[a-z]/.test(password),           // 1: At least one lowercase letter
        /\d/.test(password),              // 2: At least one number
        /[@$!%*?&]/.test(password),       // 3: At least one special character
        password.length >= 8,             // 4: Minimum 8 characters long
    ], [password]);

    // Checks if every condition in the array above is true
    const isPasswordValid = checks.every(Boolean);


    //  now when user open this link immediate check if link token is expire or right or wrong
    useEffect(() => {
        const validateToken = async () => {
            try {
                //  check if token is exist and not expire here
                const res = await axiosApi.get(`/auth/reset_password/validate/${token}`)
                if (res.data.success) {
                    setTokenError(false)
                } else {
                    setTokenError(true)
                }
            } catch (error) {
                setTokenError(true)
            } finally {
                setTokenLoading(false)
            }
        }

        validateToken()
    }, [token])



    //  when user click on the submit button
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await axiosApi.post(`/auth/reset_password/${token}`, { password })
            if (res.data.success) {
                showNotification("Password reset successfully! Please login.", "success", "bottom-center")
                navigate("/") // Redirect back to login page
            } else {
                showNotification(res.data.message || "Failed to reset password.", "error", "bottom-center")
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Something went wrong. Please try again.", "error", "bottom-center")
        } finally {
            setLoading(false)
        }
    }


    if (tokenLoading) {
        return (
            <div className="loader-wrapper-box login">
                <div className="cma-messages-are-loader-wrapper">
                    <span className="loader"></span>
                </div>
            </div>
        )
    }

    return (
        <div className="login-wrapper-box animated-box">
            <div className="login-single-box login-box-lg">
                <div className="w-100">
                    <div className='login-header'>
                        <InteractiveIcon
                            defaultIcon={BrandSmallIcon}
                            alt=""
                        />
                        <div className='login-logo-box'>
                            <h4 className='logo-text fwn-d-extrabold'>DOCSPOT <span className='version-status fwn-d-medium'>v1</span></h4>
                        </div>
                    </div>

                    {/*  if token not found */}
                    {tokenError ? (
                        <div className="text-center mt-4">
                            <h3 className="login-name text-danger">Invalid or Expired Link</h3>
                            <p className="form-label my-3 text-center">
                                This password reset link has expired or is invalid. Please request a new link.
                            </p>
                            <div className="d-block mt-4">
                                <button type="button" onClick={() => navigate("/")} className="btn-black btn-lg w-100 btn">
                                    Go to Login
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="login-name">Reset Your Password</h3>
                            <Form onSubmit={handleSubmit}>
                                {/* New Password */}
                                <Form.Group className="mb-3" controlId="formNewPassword">
                                    <Form.Label className="required-star">New Password</Form.Label>
                                    <div className='form-control-single-icon'>
                                        <InteractiveIcon
                                            defaultIcon={passwordIcon}
                                            alt=""
                                            className="form-left-icon"
                                            width={20}
                                        />
                                        <InteractiveIcon
                                            defaultIcon={showPassword ? viewIcon : viewHideIcon}
                                            alt=""
                                            className="form-right-icon"
                                            width={24}
                                            onClick={() => setShowPassword(!showPassword)}
                                        />
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter New Password"
                                            className='custom-form-control h-34'
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
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
                                </Form.Group>

                                {/* Confirm Password */}
                                <Form.Group className="mb-3" controlId="formConfirmPassword">
                                    <Form.Label className="required-star">Confirm Password</Form.Label>
                                    <div className='form-control-single-icon'>
                                        <InteractiveIcon
                                            defaultIcon={passwordIcon}
                                            alt=""
                                            className="form-left-icon"
                                            width={20}
                                        />
                                        <InteractiveIcon
                                            defaultIcon={showConfirmPassword ? viewIcon : viewHideIcon}
                                            alt=""
                                            className="form-right-icon"
                                            width={24}
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        />
                                        <Form.Control
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm New Password"
                                            className='custom-form-control h-34'
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>
                                    {confirmPassword.length > 0 && password !== confirmPassword && (
                                        <div className="invalid-feedback d-block mt-1">
                                            Passwords do not match.
                                        </div>
                                    )}
                                </Form.Group>

                                {/* Reset Button */}
                                <div className="d-block mt-4">
                                    <button
                                        type="submit"
                                        className='btn-black btn-lg w-100 btn'
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <div className="file-upload-loader"></div>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </button>
                                </div>

                            </Form>
                        </>
                    )}

                </div>
            </div>

             {/* Animation file section */}
            <div className='login-animation-wrapper'>
                <div className="login-bg-icon slow an-1">
                    <InteractiveIcon defaultIcon={listFolder1Icon} alt="" />
                </div>
                <div className="login-bg-icon medium an-2">
                    <InteractiveIcon defaultIcon={gridFolder1Icon} alt="" />
                </div>
                <div className="login-bg-icon fast an-3">
                    <InteractiveIcon defaultIcon={listFolderUser1Icon} alt="" />
                </div>
                <div className="login-bg-icon slow an-4">
                    <InteractiveIcon defaultIcon={gridFolderUser1Icon} alt="" />
                </div>
                <div className="login-bg-icon medium an-5">
                    <InteractiveIcon defaultIcon={videoFile} alt="" />
                </div>
                <div className="login-bg-icon fast an-6">
                    <InteractiveIcon defaultIcon={listFolder2Icon} alt="" />
                </div>
                <div className="login-bg-icon slow an-7">
                    <InteractiveIcon defaultIcon={gridFolder2Icon} alt="" />
                </div>
                <div className="login-bg-icon medium an-8">
                    <InteractiveIcon defaultIcon={listFolderUser2Icon} alt="" />
                </div>
                <div className="login-bg-icon fast an-9">
                    <InteractiveIcon defaultIcon={gridFolderUser2Icon} alt="" />
                </div>
                <div className="login-bg-icon slow an-10">
                    <InteractiveIcon defaultIcon={imgFile} alt="" />
                </div>
                <div className="login-bg-icon medium an-11">
                    <InteractiveIcon defaultIcon={listFolder3Icon} alt="" />
                </div>
                <div className="login-bg-icon fast an-12">
                    <InteractiveIcon defaultIcon={gridFolder3Icon} alt="" />
                </div>
                <div className="login-bg-icon slow an-13">
                    <InteractiveIcon defaultIcon={listFolderUser3Icon} alt="" />
                </div>
                <div className="login-bg-icon medium an-14">
                    <InteractiveIcon defaultIcon={gridFolderUser3Icon} alt="" />
                </div>
                <div className="login-bg-icon fast an-15">
                    <InteractiveIcon defaultIcon={pdfFile} alt="" />
                </div>
                <div className="login-bg-icon slow an-16">
                    <InteractiveIcon defaultIcon={listFolderUser3Icon} alt="" />
                </div>
                <div className="login-bg-icon medium an-17">
                    <InteractiveIcon defaultIcon={listFolder1Icon} alt="" />
                </div>
                <div className="login-bg-icon fast an-18">
                    <InteractiveIcon defaultIcon={zipFile} alt="" />
                </div>
            </div>
        </div>
    )
}

export default ResetPassword