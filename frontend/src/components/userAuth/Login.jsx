import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
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


function Login() {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)   // this is for login when user click on login button 
    const [remember, setRemember] = useState(false)
    const [error, setError] = useState("")
    const [passwordShow, setPasswordShow] = useState(false)

    const { login, isLoading, user } = useAuth()
    const navigate = useNavigate()

    //  if user is already logged in so redirect to dashboard
    useEffect(() => {
        if (!isLoading && user) {
            navigate("/dashboard")
        }
    }, [isLoading, user, navigate])


    //  pre-fill email and password if "Remember me" was selected previously
    useEffect(() => {
        const getCredential = async () => {
            if (!window.PasswordCredential) return    // if browser dont support it 

            try {
                const cred = await navigator.credentials.get({ password: true, mediation: "optional" })
                if(cred) {
                    setEmail(cred.id)
                    setPassword(cred.password)
                }
            } catch (error) {
                console.log("Credential get failed:", err.message)
            }

        }
        getCredential()
    }, [])

    //  if still loading from useAuth
    if (isLoading) {
        return (
            <div className="loader-wrapper-box login">
                <div class="cma-messages-are-loader-wrapper">
                    <span class="loader"></span>
                </div>
            </div>
        )
    }


    //  when user click on login button
    const handleSubmit = async (e) => {
        e.preventDefault()

        setError("")
        setLoading(true)

        try {
            const data = await login(email, password, remember)
            if (data && data.user) {
                if(window.PasswordCredential){
                    try {
                        const cred = new PasswordCredential({ id: email, password })
                        await navigator.credentials.store(cred)
                    } catch (error) {
                        console.log("Credential store failed:", error.message)
                    }
                }
                navigate("/dashboard")
            } else {
                setError("Login Error")
            }
        } catch (error) {
            console.log(error.message)
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
                    <h3 className="login-name">Login to Your Account</h3>
                    <Form onSubmit={handleSubmit}>
                        {/* Mobile Number*/}
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

                        {/* Password */}
                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label className="required-star">Password</Form.Label>
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
                                    width={20}
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
                        <div className="form-check-group mb-3">
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
                        {/* Login Button */}
                        <div className="d-block">
                            <button type="submit" className='btn-black btn-lg w-100 btn' disabled={loading}>
                                {loading ? (

                                    <div class="file-upload-loader"></div>

                                ) : "Login"}
                            </button>
                        </div>

                        {/* <small>
                            Don't have account <Link to="/register">Register Here</Link>
                        </small> */}



                    </Form>

                </div>

            </div>

            {/* Animation file section */}
            <div className='login-animation-wrapper'>
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










// import React, { useEffect, useState } from 'react';
// import { useAuth } from '../../context/AuthContext';
// import { useNavigate } from "react-router-dom";
// import { Button, Form } from "react-bootstrap";
// import InteractiveIcon from '../layout/InteractiveIcon';
// import BrandSmallIcon from "@images/small-logo.svg";
// import checkboxIcon from "@images/icon/checkbox-check.svg";

// import listFolder1Icon from "@images/svgs/list/SF1.svg";
// import listFolder2Icon from "@images/svgs/list/SF2.svg";
// import listFolder3Icon from "@images/svgs/list/SF3.svg";

// import gridFolder1Icon from "@images/svgs/grid/F1.svg";
// import gridFolder2Icon from "@images/svgs/grid/F2.svg";
// import gridFolder3Icon from "@images/svgs/grid/F3.svg";

// import listFolderUser1Icon from "@images/svgs/list/SF1s.svg";
// import listFolderUser2Icon from "@images/svgs/list/SF2s.svg";
// import listFolderUser3Icon from "@images/svgs/list/SF3s.svg";

// import gridFolderUser1Icon from "@images/svgs/grid/F1s.svg";
// import gridFolderUser2Icon from "@images/svgs/grid/F2s.svg";
// import gridFolderUser3Icon from "@images/svgs/grid/F3s.svg";

// import videoFile from "@images/svgs/media/video-file.svg";
// import imgFile from "@images/svgs/media/img-file.svg";
// import pdfFile from "@images/svgs/media/pdf-file.svg";
// import zipFile from "@images/svgs/media/zip-file.svg";
// import emailIcon from "@images/icon/email.svg";
// import viewIcon from "@images/icon/view.svg";
// import viewHideIcon from "@images/icon/view-hide.svg";
// import passwordIcon from "@images/icon/password.svg";


// function Login() {

//     const [email, setEmail] = useState("")
//     const [password, setPassword] = useState("")
//     const [loading, setLoading] = useState(false)   // this is for login when user click on login button
//     const [remember, setRemember] = useState(false)
//     const [error, setError] = useState("")
//     const [passwordShow, setPasswordShow] = useState(false)

//     const { login, isLoading, user } = useAuth()
//     const navigate = useNavigate()

//     //  if user is already logged in so redirect to dashboard
//     useEffect(() => {
//         if (!isLoading && user) {
//             navigate("/dashboard")
//         }
//     }, [isLoading, user, navigate])

//     //  pre-fill email and password if "Remember me" was selected previously
//     useEffect(() => {
//         const savedEmail = localStorage.getItem("rememberedEmail")
//         const savedPassword = localStorage.getItem("rememberedPassword")
//         if (savedEmail) {
//             setEmail(savedEmail)
//             setRemember(true)
//         }
//         if (savedPassword) {
//             setPassword(savedPassword)
//         }
//     }, [])

//     //  if still loading from useAuth
//     if (isLoading) {
//         return (
//             <div className="loader-wrapper-box login">
//                 <div class="cma-messages-are-loader-wrapper">
//                     <span class="loader"></span>
//                 </div>
//             </div>
//         )
//     }


//     //  when user click on login button
//     const handleSubmit = async (e) => {
//         e.preventDefault()

//         setError("")
//         setLoading(true)

//         try {
//             const data = await login(email, password, remember)
//             if (data && data.user) {
//                 if (remember) {
//                     localStorage.setItem("rememberedEmail", email)
//                     localStorage.setItem("rememberedPassword", password)
//                 } else {
//                     localStorage.removeItem("rememberedEmail")
//                     localStorage.removeItem("rememberedPassword")
//                 }
//                 navigate("/dashboard")
//             } else {
//                 setError("Login Error")
//             }
//         } catch (error) {
//             console.log(error.message)
//         } finally {
//             setLoading(false)
//         }
//     }

//     return (
//         <div  className="login-wrapper-box animated-box">

//             {/* Register Form */}
//             <div className="login-single-box login-box-lg">
//                 {/*  body */}
//                 <div className="w-100">
//                     <div className='login-header'>
//                         <InteractiveIcon
//                             defaultIcon={BrandSmallIcon}
//                             alt=""
//                         />
//                         <div className='login-logo-box'>
//                             <h4 className='logo-text fwn-d-extrabold'>DOCSPOT <span className='version-status fwn-d-medium'>v1</span></h4>
//                         </div>
//                     </div>
//                     {/* Form Register */}
//                     <h3 className="login-name">Login to Your Account</h3>
//                     <Form onSubmit={handleSubmit}>
//                         {/* Mobile Number*/}
//                         <Form.Group className="mb-3" controlId="formName">
//                             <Form.Label className="required-star">Email</Form.Label>
//                             <div className='form-control-single-icon'>
//                                 <InteractiveIcon
//                                     defaultIcon={emailIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <Form.Control
//                                     name="name"
//                                     type="email"
//                                     placeholder="Enter Email"
//                                     className='custom-form-control'
//                                     value={email}
//                                     onChange={(e) => setEmail(e.target.value)}
//                                     disabled={loading} />
//                             </div>
//                         </Form.Group>

//                         {/* Password */}
//                         <Form.Group className="mb-3" controlId="formPassword">
//                             <Form.Label className="required-star">Password</Form.Label>
//                             <div className='form-control-single-icon'>
//                                 <InteractiveIcon
//                                     defaultIcon={passwordIcon}
//                                     alt=""
//                                     className="form-left-icon"
//                                     width={20}
//                                 />
//                                 <InteractiveIcon
//                                     defaultIcon={passwordShow ? viewIcon : viewHideIcon}
//                                     alt=""
//                                     className="form-right-icon"
//                                     width={20}
//                                     onClick={() => setPasswordShow(!passwordShow)}
//                                 />
//                                 <Form.Control
//                                     name="name"
//                                     type={`${passwordShow ? "text" : "password"}`}
//                                     placeholder="Enter Password"
//                                     className='custom-form-control'
//                                     value={password}
//                                     onChange={(e) => setPassword(e.target.value)}
//                                     disabled={loading} />
//                             </div>
//                         </Form.Group>
//                         <div
//                             className="form-check-group mb-3"
//                             style={{ cursor: "pointer", userSelect: "none" }}
//                             onClick={() => setRemember(!remember)}
//                         >
//                             <label style={{ pointerEvents: "none" }}>
//                                 <InteractiveIcon
//                                     defaultIcon={checkboxIcon}
//                                     alt=""
//                                 />
//                             </label>
//                             <input
//                                 type="checkbox"
//                                 className="checkbox"
//                                 id="allcheck"
//                                 checked={remember}
//                                 readOnly
//                             />
//                             <span className='form-label m-0 ms-2' style={{ pointerEvents: "none" }}>Remember me</span>
//                         </div>
//                         {/* Register Button */}
//                         <div className="d-block">
//                             <button type="submit" className='btn-black btn-lg w-100' disabled={loading}>{loading ? "Signing In ...." : "Login"}</button>
//                         </div>

//                         {/* <small>
//                             Don't have account <Link to="/register">Register Here</Link>
//                         </small> */}



//                     </Form>

//                 </div>

//             </div>

//             {/* Animation file section */}
//             <div className='login-animation-wrapper'>
//                 <div className="login-bg-icon slow an-1">
//                     <InteractiveIcon
//                         defaultIcon={listFolder1Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon medium an-2">
//                     <InteractiveIcon
//                         defaultIcon={gridFolder1Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-3">
//                     <InteractiveIcon
//                         defaultIcon={listFolderUser1Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon slow an-4">
//                     <InteractiveIcon
//                         defaultIcon={gridFolderUser1Icon}
//                         alt=""
//                     /></div>
//                 <div className="login-bg-icon medium an-5">
//                     <InteractiveIcon
//                         defaultIcon={videoFile}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-6">
//                     <InteractiveIcon
//                         defaultIcon={listFolder2Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon slow an-7">
//                     <InteractiveIcon
//                         defaultIcon={gridFolder2Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon medium an-8">
//                     <InteractiveIcon
//                         defaultIcon={listFolderUser2Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-9">
//                     <InteractiveIcon
//                         defaultIcon={gridFolderUser2Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon slow an-10">
//                     <InteractiveIcon
//                         defaultIcon={imgFile}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon medium an-11">
//                     <InteractiveIcon
//                         defaultIcon={listFolder3Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-12">
//                     <InteractiveIcon
//                         defaultIcon={gridFolder3Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon slow an-13">
//                     <InteractiveIcon
//                         defaultIcon={listFolderUser3Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon medium an-14">
//                     <InteractiveIcon
//                         defaultIcon={gridFolderUser3Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-15">
//                     <InteractiveIcon
//                         defaultIcon={pdfFile}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon slow an-16">
//                     <InteractiveIcon
//                         defaultIcon={listFolderUser3Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon medium an-17">
//                     <InteractiveIcon
//                         defaultIcon={listFolder1Icon}
//                         alt=""
//                     />
//                 </div>
//                 <div className="login-bg-icon fast an-18">
//                     <InteractiveIcon
//                         defaultIcon={zipFile}
//                         alt=""
//                     /></div>

//             </div>
//         </div>
//     )
// }

// export default Login