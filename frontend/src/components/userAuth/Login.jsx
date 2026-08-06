import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosApi from '../../utils/api.js';

import { useAuth } from '../../context/AuthContext';
import { Button, Form } from "react-bootstrap";
import InteractiveIcon from '../layout/InteractiveIcon';
import BrandSmallIcon from "@images/small-logo.svg";
import checkboxIcon from "@images/icon/checkbox-check.svg";

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
import emailIcon from "@images/icon/email.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
import passwordIcon from "@images/icon/password.svg";
import forgotPasswordIcon from "@images/icon/forgot-password-icon.svg";
import { useNotification } from '../../context/NotificationContext.jsx';


function Login() {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)   // this is for login when user click on login button 
    const [remember, setRemember] = useState(false)
    const [error, setError] = useState("")
    const [passwordShow, setPasswordShow] = useState(false)


    //  this satte is for forgot passwrod
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [animClass, setAnimClass] = useState("scale-in")

    const { login, isLoading, user } = useAuth()
    const { showNotification } = useNotification()
    const navigate = useNavigate()

    //  this is for shared link when user open private link so it redirect to login page here
    const [searchParams] = useSearchParams()
    const redirectParam = searchParams.get("redirect")


    //  this use effect will work fo remember email field only 
    useEffect(() => {
        const savedEmail = localStorage.getItem("remembered_email")
        if (savedEmail) {
            setEmail(savedEmail)
            setRemember(true)
        }
    }, [])

    //  if user is already logged in so redirect to dashboard (or the requested shared link)
    useEffect(() => {
        if (!isLoading && user) {
            if (redirectParam) {
                navigate(redirectParam)
            } else {
                navigate("/dashboard")
            }
        }
    }, [isLoading, user, navigate, redirectParam])

    //  Show notification ONLY when redirected due to expired session (and user is NOT logged in)
    useEffect(() => {
        if (!isLoading && !user) {
            const reason = searchParams.get("reason")
            if (reason === "session_expired") {
                showNotification("Your session has expired. Please log in again.", "warning", "bottom-center")
                // Clean up URL parameter from address bar
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    }, [isLoading, user, searchParams, showNotification])


    //  pre-fill email and password if "Remember me" was selected previously
    useEffect(() => {
        const getCredential = async () => {
            if (!window.PasswordCredential) return    // if browser dont support it 

            try {
                const cred = await navigator.credentials.get({ password: true, mediation: "optional" })
                if (cred) {
                    setEmail(cred.id)
                    setPassword(cred.password)
                }
            } catch (error) {
                console.log("Credential get failed:", error.message)
            }

        }
        getCredential()
    }, [])

    //  If user is already authenticated or auth is loading, do NOT render login form UI
    if (user) {
        return null;
    }

    if (isLoading) {
        const hasSessionHint = localStorage.getItem("docspot_has_session") === "true";
        if (hasSessionHint) {
            return (
                <div className="loader-wrapper-box login">
                    <div className="cma-messages-are-loader-wrapper">
                        <span className="loader"></span>
                    </div>
                </div>
            )
        }
    }

    //  smooth switch function for forgot password - scale + 3D tilt animation
    const switchToForgotPassword = (value) => {
        setAnimClass(value ? "scale-out-forward" : "scale-out-back")
        setTimeout(() => {
            setIsForgotPassword(value)
            setAnimClass("scale-in")
        }, 220)
    }


    //  when user click on login button
    const handleSubmit = async (e) => {
        e.preventDefault()

        setError("")
        setLoading(true)

        try {
            const data = await login(email, password, remember)
            if (data && data.user) {

                //  save or clear email in the local storage based on the remember
                if (remember) {
                    localStorage.setItem("remembered_email", email)
                } else {
                    localStorage.removeItem("remembered_email")
                }

                if (window.PasswordCredential) {
                    try {
                        const cred = new PasswordCredential({ id: email, password })
                        await navigator.credentials.store(cred)
                    } catch (error) {
                        console.log("Credential store failed:", error.message)
                    }
                }
                if (redirectParam) {
                    navigate(redirectParam)
                } else {
                    navigate("/dashboard")
                }
            } else {
                setError("Login Error")

            }
        } catch (error) {
            console.log(error.message)

        } finally {
            setLoading(false)
        }
    }



    //  this fucntion is used for the forgot password api here
    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await axiosApi.post("/auth/forgot_password", { email })
            if (res.data.success) {
                showNotification("Password reset link has been sent to your email.", "success", "bottom-center")
                switchToForgotPassword(false)
            } else {
                showNotification(res.data.message || "Failed to send reset link.", "error", "bottom-center")
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Something went wrong. Please try again.", "error", "bottom-center")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper-box animated-box">

            {/* Register Form */}
            <div className="login-single-box login-box-lg">
                {/*  body */}
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
                    {/* Form Register */}
                    {/* Form Register */}
                    <div className={`login-form-anim-wrapper ${animClass}`}>
                        <h3 className="login-name">
                            {isForgotPassword ? "Reset Your Password" : "Login to Your Account"}
                        </h3>

                        {/* {isForgotPassword && (
                            <div className="reset-lock-icon-box reset-icon-animate">                             
                                <p className="reset-lock-text">We'll send a reset link to your email</p>
                            </div>
                        )} */}

                        <Form onSubmit={isForgotPassword ? handleForgotPasswordSubmit : handleSubmit}>
                            {/* Email Input */}
                            <Form.Group className="mb-3" controlId="formName">
                                <Form.Label className="required-star">Email</Form.Label>
                                <div className='form-control-single-icon'>
                                    <InteractiveIcon
                                        defaultIcon={emailIcon}
                                        alt=""
                                        className="form-left-icon"
                                        width={20}
                                    />
                                    <Form.Control
                                        name="name"
                                        type="email"
                                        placeholder="Enter Email"
                                        className='custom-form-control h-34'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading} />
                                </div>
                            </Form.Group>

                            {/* Password and Remember Me: Hidden when in Forgot Password mode */}
                            {!isForgotPassword && (
                                <>
                                    {/* Password */}
                                    <Form.Group className="mb-3" controlId="formPassword">
                                        <Form.Label className="form-label d-flex align-items-center justify-content-between w-100">
                                            <span className="required-star">Password</span>
                                            <span
                                                className="clear-btn"
                                                onClick={() => switchToForgotPassword(true)}
                                            >
                                                Forgot Password?
                                            </span>
                                        </Form.Label>
                                        <div className='form-control-single-icon'>
                                            <InteractiveIcon
                                                defaultIcon={passwordIcon}
                                                alt=""
                                                className="form-left-icon"
                                                width={20}
                                            />
                                            <InteractiveIcon
                                                defaultIcon={passwordShow ? viewIcon : viewHideIcon}
                                                alt=""
                                                className="form-right-icon"
                                                width={24}
                                                onClick={() => setPasswordShow(!passwordShow)}
                                            />
                                            <Form.Control
                                                name="name"
                                                type={`${passwordShow ? "text" : "password"}`}
                                                placeholder="Enter Password"
                                                className='custom-form-control h-34'
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={loading} />
                                        </div>
                                    </Form.Group>

                                    {/* Remember Me */}
                                    <div className="form-check-group mb-4">
                                        <label htmlFor="allcheck">
                                            <InteractiveIcon
                                                defaultIcon={checkboxIcon}
                                                alt=""
                                            />
                                        </label>
                                        <input type="checkbox" className="checkbox" name="" id="allcheck"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)} />
                                        <span className='form-label m-0 ms-2'>Remember me</span>
                                    </div>
                                </>
                            )}

                            {/* Dynamic Button (Login or Send Link) */}
                            <div className="d-block">
                                <button type="submit" className='btn-black btn-lg w-100 btn' disabled={loading}>
                                    {loading ? (
                                        <div className="file-upload-loader"></div>
                                    ) : (
                                        isForgotPassword ? "Send Reset Link" : "Login"
                                    )}
                                </button>
                            </div>

                            {isForgotPassword && (
                                <div className="forgot-back-btn-sec">
                                    <button
                                        type="button"
                                        className="clear-btn"
                                        onClick={() => switchToForgotPassword(false)}
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            )}
                        </Form>
                    </div>


                </div>

            </div>

            {/* Animation file section */}
            <div className={`login-animation-wrapper ${isForgotPassword ? "forgot-mode" : ""}`}>
                <div className="login-bg-icon slow an-1">
                    <InteractiveIcon
                        defaultIcon={listFolder1Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon medium an-2">
                    <InteractiveIcon
                        defaultIcon={gridFolder1Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-3">
                    <InteractiveIcon
                        defaultIcon={listFolderUser1Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon slow an-4">
                    <InteractiveIcon
                        defaultIcon={gridFolderUser1Icon}
                        alt=""
                    /></div>
                <div className="login-bg-icon medium an-5">
                    <InteractiveIcon
                        defaultIcon={videoFile}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-6">
                    <InteractiveIcon
                        defaultIcon={listFolder2Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon slow an-7">
                    <InteractiveIcon
                        defaultIcon={gridFolder2Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon medium an-8">
                    <InteractiveIcon
                        defaultIcon={listFolderUser2Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-9">
                    <InteractiveIcon
                        defaultIcon={gridFolderUser2Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon slow an-10">
                    <InteractiveIcon
                        defaultIcon={imgFile}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon medium an-11">
                    <InteractiveIcon
                        defaultIcon={listFolder3Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-12">
                    <InteractiveIcon
                        defaultIcon={gridFolder3Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon slow an-13">
                    <InteractiveIcon
                        defaultIcon={listFolderUser3Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon medium an-14">
                    <InteractiveIcon
                        defaultIcon={gridFolderUser3Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-15">
                    <InteractiveIcon
                        defaultIcon={pdfFile}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon slow an-16">
                    <InteractiveIcon
                        defaultIcon={listFolderUser3Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon medium an-17">
                    <InteractiveIcon
                        defaultIcon={listFolder1Icon}
                        alt=""
                    />
                </div>
                <div className="login-bg-icon fast an-18">
                    <InteractiveIcon
                        defaultIcon={zipFile}
                        alt=""
                    /></div>

            </div>
        </div>
    )
}

export default Login



