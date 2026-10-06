// import express from "express"
// import path from "path"
// import fs from "fs"
// import { V3 } from "paseto"
// import { createSecretKey } from "crypto"
// import { getStorage } from "../services/storageFactory.js"


// //  models 
// import userModel from "#models/userModel"


// const servingFileRouter = express.Router()

// const DEV_REFERERS = [
//     "http://localhost:5177",
//     "https://localhost:5177",
//     "http://192.168.1.19:5177",
//     "https://192.168.1.19:5177",
//     "http://192.168.1.35:5177",
//     "https://192.168.1.35:5177",
//     "http://192.168.1.112:5177",
//     "https://192.168.1.112:5177",
//     "https://192.168.1.213:5177",
// ]


// const isFromApp = (referer, origin) => {
//     const isDev = process.env.NODE_ENV !== "production"
//     const PRODUCTION_DOMAIN = process.env.ALLOWED_DOMAIN?.replace(/"/g, "")
//     if (isDev) {
//         return DEV_REFERERS.some(r => referer.startsWith(r) || origin === r)
//     } else {
//         return origin.endsWith(`.${PRODUCTION_DOMAIN}`) ||
//             origin === `https://${PRODUCTION_DOMAIN}` ||
//             referer.startsWith(`https://${PRODUCTION_DOMAIN}`) ||
//             referer.startsWith(`https://*.${PRODUCTION_DOMAIN}`)
//     }
// }


// const getKey = () => {
//     return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
// }


// const getAccessDeniedHTML = (message) => `
// <html>
// <body style="font-family:sans-serif;text-align:center;padding:50px">
// <h2 style="color:#d9534f">Access Denied</h2>
// <p>${message}</p>
// </body>
// </html>
// `

// servingFileRouter.get("/*splat", async (req, res) => {
//     res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")

//     try {
//         const referer = req.headers.referer || req.headers.referrer || ""
//         const origin = req.headers.origin || ""

//         if (isFromApp(referer, origin)) {
//             return await serveFile(req, res)
//         }

//         //  if some user open the direct link in the borwser if cookie is set then only give
//         const token = req.cookies?.auth_token
//         if (!token) {
//             return res.status(401).send(getAccessDeniedHTML("Access Denied"))
//         }

//         //  decode token adn verify that is this user actuly in our database or not 
//         let decoded
//         try {
//             decoded = await V3.decrypt(token, getKey())
//         } catch (error) {
//             return res.status(401).send(getAccessDeniedHTML("Access Denied"))
//         }

//         const user = await userModel.findById(decoded.id)
//         if (!user || !user.is_active || user.is_deleted) {
//             return res.status(401).send(getAccessDeniedHTML("Access Denied"))
//         }

//         return await serveFile(req, res)

//     } catch (error) {
//         console.error("Uploads router error:", error)
//         return res.status(500).send(getAccessDeniedHTML("Internal Server Error occurred while trying to view this file."))
//     }
// })



// async function serveFile(req, res) {
//     try {
//         const storagePath = "files" + req.path;
//         const storage = getStorage();

//         const result = await storage.getFileStream(storagePath, req.headers.range);

//         if (!result) {
//             return res.status(404).send("File Not Found");
//         }

//         if (result.headers) {
//             res.set(result.headers);
//         }

//         if (result.status) {
//             res.status(result.status);
//         }

//         result.stream.pipe(res);
//     } catch (error) {
//         console.error("Error serving file:", error);
//         if (!res.headersSent) {
//             res.status(500).send("Internal Server Error");
//         }
//     }
// }


// export default servingFileRouter







import express from "express"
import path from "path"
import fs from "fs"
import { V3 } from "paseto"
import { createSecretKey } from "crypto"
import { getStorage } from "../services/storageFactory.js"


//  models 
import userModel from "#models/userModel"
import uploadModel from "#models/uploadModel"
import SharedLink from "#models/sharedLinksModel"    // adjust path to match your actual file


const servingFileRouter = express.Router()

const DEV_REFERERS = [
    "http://localhost:5177",
    "https://localhost:5177",
    "http://192.168.1.19:5177",
    "https://192.168.1.19:5177",
    "http://192.168.1.35:5177",
    "https://192.168.1.35:5177",
    "http://192.168.1.112:5177",
    "https://192.168.1.112:5177",
    "https://192.168.1.213:5177",
]


const isFromApp = (referer, origin) => {
    const isDev = process.env.NODE_ENV !== "production"
    const PRODUCTION_DOMAIN = process.env.ALLOWED_DOMAIN?.replace(/"/g, "")
    if (isDev) {
        return DEV_REFERERS.some(r => referer.startsWith(r) || origin === r)
    } else {
        return origin.endsWith(`.${PRODUCTION_DOMAIN}`) ||
            origin === `https://${PRODUCTION_DOMAIN}` ||
            referer.startsWith(`https://${PRODUCTION_DOMAIN}`) ||
            referer.startsWith(`https://*.${PRODUCTION_DOMAIN}`)
    }
}


const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}


const getAccessDeniedHTML = (message) => `

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Access Denied</title>
<style>
  *{
    box-sizing: border-box;
  }

  html, body{
    height: 100%;
    margin: 0;
  }

  body{
    font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }

  .access-denied-card{
    width: min(498px, 100%);
    border-radius: 36px;
    overflow: hidden;
    border: 1px solid #bebec7;
    background: linear-gradient(126.65deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
    box-shadow: 0px 8px 32px 0px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  /* ---- top: scene with fanned file icons ---- */
  .access-denied-card__scene{
    position: relative;
    width: 100%;
    aspect-ratio: 498 / 188;
    overflow: hidden;
  }

  .access-denied-card__files{
    position: absolute;
    left: 50%;
    top: 41.5%;
    transform: translateX(-50%);
    width: 60.2%;
    height: 69.1%;
  }

  .access-denied-card__file{
    position: absolute;
  }

  .access-denied-card__file svg{
    display: block;
    width: 100%;
    height: 100%;
  }

  .access-denied-card__file--1{
    left: -9.3%;
    top: 13.8%;
    width: 35.3%;
    height: 70.8%;
    transform: rotate(-25deg);
  }

  .access-denied-card__file--2{
    left: 17%;
    top: 10%;
    width: 30.7%;
    height: 82.3%;
    transform: rotate(-3deg);
  }

  .access-denied-card__file--3{
    left: 48%;
    top: 0;
    width: 38%;
    height: 100%;
    transform: rotate(12deg);
  }

  .access-denied-card__file--4{
    left: 78%;
    top: 12.3%;
    width: 38.7%;
    height: 69.2%;
    transform: rotate(9deg);
    z-index: -1;
  }

  /* ---- bottom: frosted panel ---- */
  .access-denied-card__panel{
    padding: clamp(28px, 8vw, 56px) clamp(20px, 6vw, 40px) clamp(20px, 5vw, 32px);
    background: #0000000f;
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 36px;
    text-align: center;
  }

  .access-denied-card__title{
    margin: 0 0 12px;
    font-size:clamp(18px, 4.5vw, 22px);
    font-weight: 700;
    color: #212121;
  }

  .access-denied-card__description{
    margin: 0 0 24px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #00000099;
  }

  .access-denied-card__status {
    font-size: clamp(24px, 6vw, 32px);
    font-weight: 800;
    color: #212121;
    width: 46px;
    height: 46px;
    background:#ffff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    margin: 0 auto 16px auto;
}
    .access-denied-card__status svg {
    stroke: #00000099;
}
</style>
</head>
<body>

<div class="access-denied-card">

  <div class="access-denied-card__scene">
    <div class="access-denied-card__files">

      <div class="access-denied-card__file access-denied-card__file--1">
        <svg viewBox="0 0 116 99" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_d_3133_966)">
<mask id="path-1-inside-1_3133_966" fill="white">
<path d="M109 20.333C111.209 20.333 113 22.1239 113 24.333V86.791H3V6C3 3.79086 4.79086 2 7 2H48.833C53.8537 2.30554 56.9755 6.58314 58.8223 9.63867L60.6689 12.6943C62.5157 15.7499 66.7291 20.0274 71.75 20.333H109Z"/>
</mask>
<path d="M109 20.333C111.209 20.333 113 22.1239 113 24.333V86.791H3V6C3 3.79086 4.79086 2 7 2H48.833C53.8537 2.30554 56.9755 6.58314 58.8223 9.63867L60.6689 12.6943C62.5157 15.7499 66.7291 20.0274 71.75 20.333H109Z" fill="url(#paint0_linear_3133_966)"/>
<path d="M113 24.333H114V24.333L113 24.333ZM113 86.791V87.791H114V86.791H113ZM3 86.791H2V87.791H3V86.791ZM3 6L2 6V6H3ZM48.833 2L48.8938 1.00185L48.8634 1H48.833V2ZM58.8223 9.63867L59.6781 9.12144L59.6781 9.1214L58.8223 9.63867ZM60.6689 12.6943L59.8131 13.2116L59.8131 13.2116L60.6689 12.6943ZM71.75 20.333L71.6893 21.3312L71.7196 21.333H71.75V20.333ZM109 20.333V21.333C110.657 21.333 112 22.6762 112 24.333L113 24.333L114 24.333C114 21.5716 111.761 19.333 109 19.333V20.333ZM113 24.333H112V86.791H113H114V24.333H113ZM113 86.791V85.791H3V86.791V87.791H113V86.791ZM3 86.791H4V6H3H2V86.791H3ZM3 6L4 6C4 4.34315 5.34314 3 7 3V2V1C4.23857 1 2 3.23858 2 6L3 6ZM7 2V3H48.833V2V1H7V2ZM48.833 2L48.7723 2.99815C53.2293 3.26939 56.1119 7.08754 57.9664 10.1559L58.8223 9.63867L59.6781 9.1214C57.8391 6.07874 54.4782 1.3417 48.8938 1.00185L48.833 2ZM58.8223 9.63867L57.9664 10.1559L59.8131 13.2116L60.6689 12.6943L61.5248 12.1771L59.6781 9.12144L58.8223 9.63867ZM60.6689 12.6943L59.8131 13.2116C60.7954 14.8368 62.3901 16.7643 64.4046 18.3338C66.4173 19.9019 68.9143 21.1623 71.6893 21.3312L71.75 20.333L71.8107 19.3349C69.5648 19.1982 67.4447 18.167 65.6338 16.7561C63.8246 15.3465 62.3893 13.6075 61.5248 12.1771L60.6689 12.6943ZM71.75 20.333V21.333H109V20.333V19.333H71.75V20.333Z" fill="#BEBEC7" mask="url(#path-1-inside-1_3133_966)"/>
</g>
<mask id="path-3-inside-2_3133_966" fill="white">
<path d="M3 84.5H113V94.25C113 96.4591 111.209 98.25 109 98.25H7C4.79086 98.25 3 96.4591 3 94.25V84.5Z"/>
</mask>
<path d="M3 84.5H113V94.25C113 96.4591 111.209 98.25 109 98.25H7C4.79086 98.25 3 96.4591 3 94.25V84.5Z" fill="#EA3843"/>
<path d="M3 84.5H113H3M114 94.25C114 97.0114 111.761 99.25 109 99.25H7C4.23858 99.25 2 97.0114 2 94.25H4C4 95.9069 5.34315 97.25 7 97.25H109C110.657 97.25 112 95.9069 112 94.25H114ZM7 99.25C4.23858 99.25 2 97.0114 2 94.25V84.5H4V94.25C4 95.9069 5.34315 97.25 7 97.25V99.25ZM114 84.5V94.25C114 97.0114 111.761 99.25 109 99.25V97.25C110.657 97.25 112 95.9069 112 94.25V84.5H114Z" fill="black" fill-opacity="0.2" mask="url(#path-3-inside-2_3133_966)"/>
<defs>
<filter id="filter0_d_3133_966" x="0" y="0" width="116" height="90.791" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="1"/>
<feGaussianBlur stdDeviation="1.5"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3133_966"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3133_966" result="shape"/>
</filter>
<linearGradient id="paint0_linear_3133_966" x1="58" y1="86.791" x2="58" y2="2" gradientUnits="userSpaceOnUse">
<stop stop-color="#FCE7E8"/>
<stop offset="0.5" stop-color="white"/>
</linearGradient>
</defs>
</svg>
      </div>

      <div class="access-denied-card__file access-denied-card__file--2">
        <svg width="93" height="105" viewBox="0 0 93 105" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.9414 0.5L56.665 0.5C57.0394 0.500042 57.4004 0.640025 57.6768 0.892578L92.0117 32.2744C92.3226 32.5586 92.5 32.9606 92.5 33.3818V95C92.5 100.205 87.8684 104.5 82.0586 104.5H10.9414C5.13163 104.5 0.5 100.205 0.5 95L0.5 10C0.5 4.79467 5.13163 0.5 10.9414 0.5Z" fill="url(#paint0_linear_3138_996)" stroke="#BEBEC7" stroke-linejoin="round" />
            <path d="M56.2236 0.5C56.598 0.500117 56.959 0.640008 57.2354 0.892578L91.6289 32.3281C91.9138 32.5885 92.0881 32.949 92.1143 33.334L92.1826 34.3447C91.0951 32.7432 89.454 31.7273 87.7178 31.0918C85.0327 30.1092 82.0505 30 80.3232 30H62.4404C60.5075 29.9999 58.9404 28.4329 58.9404 26.5V10.5C58.9404 8.89667 59.1544 6.1362 58.2168 3.8125C57.739 2.62845 56.9581 1.53733 55.6992 0.748047C55.5603 0.660963 55.4154 0.578936 55.2656 0.5H56.2236Z" fill="white" stroke="#BEBEC7" stroke-linejoin="round" />
            <path d="M66.9985 77.4344L75.8034 85.7142C77.4702 87.2815 76.314 90 73.9807 90L19.0238 89.9995C16.6905 89.9995 15.5344 87.281 17.2012 85.7137L31.5961 72.1773C34.6832 69.2742 39.6886 69.2742 42.7758 72.1773L52.0925 80.9383L55.8188 77.4344C58.906 74.5313 63.9113 74.5313 66.9985 77.4344Z" fill="url(#paint1_linear_3138_996)" />
            <path d="M73.8552 63.75C73.8552 67.2018 70.7936 70 67.017 70C63.2403 70 60.1787 67.2018 60.1787 63.75C60.1787 60.2982 63.2403 57.5 67.017 57.5C70.7936 57.5 73.8552 60.2982 73.8552 63.75Z" fill="url(#paint2_linear_3138_996)" />
            <defs>
                <linearGradient id="paint0_linear_3138_996" x1="42.1305" y1="3.35454" x2="49.6556" y2="102.557" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F0F2F2" />
                    <stop offset="0.5" stop-color="white" />
                </linearGradient>
                <linearGradient id="paint1_linear_3138_996" x1="59.039" y1="89.9999" x2="59.039" y2="56.9341" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#BEBEC7" />
                    <stop offset="1" stop-color="#96969C" />
                </linearGradient>
                <linearGradient id="paint2_linear_3138_996" x1="59.039" y1="89.9999" x2="59.039" y2="56.9341" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#BEBEC7" />
                    <stop offset="1" stop-color="#96969C" />
                </linearGradient>
            </defs>
        </svg>
      </div>

      <div class="access-denied-card__file access-denied-card__file--3">
        <svg width="115" height="130" viewBox="0 0 115 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.4121 0.5H69.6299C70.0069 0.500039 70.3704 0.641725 70.6475 0.897461L113.018 40.0117C113.325 40.2956 113.5 40.6949 113.5 41.1133V117.619C113.5 124.144 107.757 129.5 100.588 129.5H13.4121C6.24277 129.5 0.500052 124.144 0.5 117.619V12.3809C0.500054 5.85613 6.24277 0.5 13.4121 0.5Z" fill="url(#paint0_linear_3138_1003)" stroke="#BEBEC7" stroke-linejoin="round" />
            <path d="M69.7178 0.5C70.0948 0.5 70.4583 0.641808 70.7354 0.897461L113.1 40.0059C113.41 40.2922 113.585 40.6961 113.582 41.1182L113.578 41.5938C113.429 41.2914 113.264 41.0091 113.084 40.7471C112.155 39.3959 110.868 38.6167 109.466 38.1777C108.072 37.7416 106.552 37.6365 105.123 37.6357C104.407 37.6354 103.705 37.6619 103.05 37.6875C102.39 37.7132 101.782 37.7383 101.235 37.7383H78.4121C76.4792 37.7383 74.9122 36.1712 74.9121 34.2383V13.4766C74.9121 11.4206 74.872 7.94106 73.4287 4.97168C72.7015 3.47552 71.6143 2.09873 69.9941 1.09961C69.6365 0.879053 69.2535 0.679577 68.8457 0.5H69.7178Z" fill="white" stroke="#BEBEC7" stroke-linejoin="round" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M30.178 3.08984H20.1191V12.3756C20.1191 14.085 21.6203 15.4708 23.4721 15.4708H30.178V27.8517H23.4721C21.6203 27.8517 20.1191 29.2375 20.1191 30.947V37.1375C20.1191 38.8469 21.6203 40.2327 23.4721 40.2327H30.178V52.6137H23.4721C21.6203 52.6137 20.1191 53.9994 20.1191 55.7089V61.8994C20.1191 63.6088 21.6203 64.9946 23.4721 64.9946H30.178V77.3756H23.4721C21.6203 77.3756 20.1191 78.7613 20.1191 80.4708V86.6613C20.1191 88.3707 21.6203 89.7565 23.4721 89.7565H26.825C28.6768 89.7565 30.178 88.3707 30.178 86.6613V77.3756H36.8838C38.7356 77.3756 40.2368 75.9898 40.2368 74.2803V68.0898C40.2368 66.3804 38.7356 64.9946 36.8838 64.9946H30.178V52.6137H36.8838C38.7356 52.6137 40.2368 51.2279 40.2368 49.5184V43.3279C40.2368 41.6185 38.7356 40.2327 36.8838 40.2327H30.178V27.8517H36.8838C38.7356 27.8517 40.2368 26.466 40.2368 24.7565V18.566C40.2368 16.8566 38.7356 15.4708 36.8838 15.4708H30.178V3.08984ZM23.9851 92.8518C21.9447 92.8518 20.3773 94.52 20.6659 96.3847L23.0608 111.861C23.2968 113.386 24.7115 114.518 26.3801 114.518H33.9759C35.6444 114.518 37.0591 113.386 37.2951 111.861L39.69 96.3847C39.9786 94.52 38.4112 92.8518 36.3708 92.8518H23.9851ZM28.804 99.0422C27.7681 99.0422 26.9801 99.901 27.1504 100.844L28.5243 108.454C28.8356 110.179 31.5203 110.179 31.8316 108.454L33.2056 100.844C33.3759 99.901 32.5878 99.0422 31.5519 99.0422H28.804Z" fill="url(#paint1_linear_3138_1003)" />
            <defs>
                <linearGradient id="paint0_linear_3138_1003" x1="51.6438" y1="4.15324" x2="61.0529" y2="126.961" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F0F2F2" />
                    <stop offset="0.5" stop-color="white" />
                </linearGradient>
                <linearGradient id="paint1_linear_3138_1003" x1="34.3691" y1="114.518" x2="34.3691" y2="1.14948" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#BEBEC7" />
                    <stop offset="1" stop-color="#96969C" />
                </linearGradient>
            </defs>
        </svg>
      </div>

      <div class="access-denied-card__file access-denied-card__file--4">
        <svg viewBox="0 0 142 125" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 0.5H59.1484C65.3411 0.883465 69.2474 6.17181 71.6338 10.1201L74.0176 14.0645C75.239 16.0853 77.2348 18.499 79.7539 20.4619C82.2722 22.4241 85.3467 23.9607 88.7197 24.166L88.7344 24.167H138C139.933 24.167 141.5 25.734 141.5 27.667V108.958H0.5V4C0.5 2.067 2.067 0.5 4 0.5Z" fill="url(#paint0_linear_3135_972)" stroke="#BEBEC7"/>
<path d="M106.5 71C111.402 71 115.375 67.0265 115.375 62.125C115.375 57.2235 111.402 53.25 106.5 53.25C101.598 53.25 97.625 57.2235 97.625 62.125C97.625 67.0265 101.598 71 106.5 71Z" fill="#FF8A00"/>
<path d="M124.25 85.7917C124.25 90.6926 124.25 94.6667 106.5 94.6667C88.75 94.6667 88.75 90.6926 88.75 85.7917C88.75 80.8907 96.6976 76.9167 106.5 76.9167C116.302 76.9167 124.25 80.8907 124.25 85.7917Z" fill="#FF8A00"/>
<mask id="path-3-inside-1_3135_972" fill="white">
<path d="M0 106.5H142V120.25C142 122.459 140.209 124.25 138 124.25H4C1.79086 124.25 0 122.459 0 120.25V106.5Z"/>
</mask>
<path d="M0 106.5H142V120.25C142 122.459 140.209 124.25 138 124.25H4C1.79086 124.25 0 122.459 0 120.25V106.5Z" fill="#FF8A00"/>
<path d="M0 106.5H142H0M143 120.25C143 123.011 140.761 125.25 138 125.25H4C1.23858 125.25 -1 123.011 -1 120.25H1C1 121.907 2.34315 123.25 4 123.25H138C139.657 123.25 141 121.907 141 120.25H143ZM4 125.25C1.23858 125.25 -1 123.011 -1 120.25V106.5H1V120.25C1 121.907 2.34315 123.25 4 123.25V125.25ZM143 106.5V120.25C143 123.011 140.761 125.25 138 125.25V123.25C139.657 123.25 141 121.907 141 120.25V106.5H143Z" fill="black" fill-opacity="0.2" mask="url(#path-3-inside-1_3135_972)"/>
<defs>
<linearGradient id="paint0_linear_3135_972" x1="71" y1="109.458" x2="71" y2="0" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF0E0"/>
<stop offset="0.5" stop-color="white"/>
</linearGradient>
</defs>
</svg>
      </div>

    </div>
  </div>

  <div class="access-denied-card__panel">

<div class="access-denied-card__status">
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.04507 7.04507C6.0004 8.08973 5.17173 9.32993 4.60636 10.6949C4.04099 12.0598 3.75 13.5227 3.75 15.0001C3.75 16.4774 4.04099 17.9404 4.60636 19.3053C5.17173 20.6702 6.0004 21.9104 7.04507 22.9551C8.08973 23.9997 9.32993 24.8284 10.6949 25.3938C12.0598 25.9591 13.5227 26.2501 15.0001 26.2501C16.4774 26.2501 17.9404 25.9591 19.3053 25.3938C20.6702 24.8284 21.9104 23.9997 22.9551 22.9551M7.04507 7.04507C8.08973 6.0004 9.32993 5.17173 10.6949 4.60636C12.0598 4.04099 13.5227 3.75 15.0001 3.75C16.4774 3.75 17.9404 4.04099 19.3053 4.60636C20.6702 5.17173 21.9104 6.0004 22.9551 7.04507C23.9997 8.08973 24.8284 9.32993 25.3938 10.6949C25.9591 12.0598 26.2501 13.5227 26.2501 15.0001C26.2501 16.4774 25.9591 17.9404 25.3938 19.3053C24.8284 20.6702 23.9997 21.9104 22.9551 22.9551M7.04507 7.04507L15.0001 15.0001L22.9551 22.9551"  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</div>

    <h1 class="access-denied-card__title">Access Denied</h1>
    <p class="access-denied-card__description">
      You don't have permission to view this page.
    </p>
  </div>

</div>

</body>
</html>
`

//  ---------------------------------------------------------------
//  NEW - check if requested file is covered by a valid shared link
//  ---------------------------------------------------------------
const checkSharedLinkAccess = async (req) => {
    const token = req.query.token
    if (!token) return false

    const link = await SharedLink.findOne({ token })
    if (!link) return false

    //  link must be public to allow guest access with no login
    if (!link.is_public) return false

    //  check expiry
    if (link.is_expired) return false
    if (link.expire_date && new Date() > new Date(link.expire_date)) return false

    //  find the actual file being requested on disk
    const storagePath = "files" + req.path
    const requestedFile = await uploadModel.findOne({ storagePath })
    if (!requestedFile) return false

    //  case 1 - link points directly to this file
    if (String(requestedFile._id) === String(link.item_id)) return true

    //  case 2 - link points to a folder, walk up the parent chain
    //  to see if requestedFile lives inside that shared folder
    let currentParentId = requestedFile.parent
    while (currentParentId) {
        if (String(currentParentId) === String(link.item_id)) return true
        const parentDoc = await uploadModel.findById(currentParentId).select("parent")
        if (!parentDoc) break
        currentParentId = parentDoc.parent
    }

    return false
}


servingFileRouter.get("/*splat", async (req, res) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")

    try {
        const referer = req.headers.referer || req.headers.referrer || ""
        const origin = req.headers.origin || ""

        if (isFromApp(referer, origin)) {
            return await serveFile(req, res)
        }

        //  NEW - allow guest access via valid public share link token
        const hasSharedLinkAccess = await checkSharedLinkAccess(req)
        if (hasSharedLinkAccess) {
            return await serveFile(req, res)
        }

        //  if some user open the direct link in the borwser if cookie is set then only give
        const token = req.cookies?.doc_auth_token || req.cookies?.auth_token
        if (!token) {
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }

        //  decode token adn verify that is this user actuly in our database or not 
        let decoded
        try {
            decoded = await V3.decrypt(token, getKey())
        } catch (error) {
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }

        const user = await userModel.findById(decoded.id)
        if (!user || !user.is_active || user.is_deleted) {
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }

        return await serveFile(req, res)

    } catch (error) {
        console.error("Uploads router error:", error)
        return res.status(500).send(getAccessDeniedHTML("Internal Server Error occurred while trying to view this file."))
    }
})



async function serveFile(req, res) {
    try {
        const storagePath = "files" + req.path;
        const storage = getStorage();

        const result = await storage.getFileStream(storagePath, req.headers.range);

        if (!result) {
            return res.status(404).send("File Not Found");
        }

        if (result.headers) {
            res.set(result.headers);
        }

        if (result.status) {
            res.status(result.status);
        }

        result.stream.pipe(res);
    } catch (error) {
        console.error("Error serving file:", error);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
}


export default servingFileRouter