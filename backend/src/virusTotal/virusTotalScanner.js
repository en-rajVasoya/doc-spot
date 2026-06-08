//  this file is used for generate hash of file and send has to VIRUS TOTAL api and get resposne
//  if file hash not found in virus total DB then upload file to virus ttoal and check max limit here is 650MB
import dotenv from "dotenv"
dotenv.config()
import fs, { stat } from "fs"
import crypto from "crypto"


//  virus total api key
const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY
const VT_BASE_URL = "https://www.virustotal.com/api/v3"

const vtHeaders = {
    "x-apikey": VT_API_KEY,
    "Accept": "application/json"
}


const MAX_POLLS = 20
const POLL_INTERVAL = 15000

console.log("[VT] API Key:", VT_API_KEY?.substring(0, 8) + "...")


//  calculate the hash of uploaded file here
export const calculateHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256")
        const stream = fs.createReadStream(filePath)
        stream.on("data", (data) => hash.update(data))
        stream.on("end", () => resolve(hash.digest("hex")))
        stream.on("error", (error) => reject(error))
    })
}




// check hash in virusTotal database
export const checkHashVirusTotal = async (hash) => {
    try {
        const response = await fetch(`${VT_BASE_URL}/files/${hash}`, {
            headers: vtHeaders
        })

        if (response.status === 404) {
            return { found: false }
        }

        const data = await response.json()
        console.log("[VT] Stats only:", JSON.stringify(data.data?.attributes?.last_analysis_stats, null, 2))
        console.log("[VT] Raw response:", JSON.stringify(data.data?.attributes?.last_analysis_stats, null, 2))

        const stats = data.data?.attributes?.last_analysis_stats
        console.log("[VT] Stats:", stats)

        const malicious = stats?.malicious || 0
        const suspicious = stats?.suspicious || 0

        console.log("[VT] Malicious:", malicious, "Suspicious:", suspicious)

        return {
            found: true,
            clean: malicious === 0 && suspicious === 0,
            malicious,
            suspicious,
            virusName: data.data?.attributes?.popular_threat_classification?.suggested_threat_label ||
                data.data?.attributes?.meaningful_name ||
                "Unknown malware"
        }

    } catch (error) {
        throw new Error(`Hash check failed: ${error.message}`)
    }
}


//  if hash not found in databse then upload a small fil ethere
export const uploadFileVirusTotal = async (filePath) => {
    try {
        const fileName = filePath.split("/").pop().split("\\").pop()

        // read file as buffer and convert to Blob
        const fileBuffer = await fs.promises.readFile(filePath)
        const blob = new Blob([fileBuffer])

        const formData = new FormData()
        formData.append("file", blob, fileName)


        //  send file
        const response = await fetch(`${VT_BASE_URL}/files`, {
            method: "POST",
            headers: {
                "x-apikey": VT_API_KEY,
            },
            body: formData
        })


        const data = await response.json()
        return data.data?.id   // return id and use in diffren functtion for gettng report

    } catch (error) {
        throw new Error(`File upload failed: ${error.message}`)
    }
}




// in virus total for uplading large file first we need to get the urll to store that file so this function does that
export const getLargeFileUploadUrl = async () => {
    try {
        const response = await fetch(`${VT_BASE_URL}/files/upload_url`, {
            headers: vtHeaders
        })
        console.log("[VT] Get upload URL status:", response.status)
        const data = await response.json()
        console.log("[VT] Upload URL response:", JSON.stringify(data, null, 2))
        return data.data
    } catch (error) {
        throw new Error(`Get upload url failed: ${error.message}`)
    }
}




//  after getting url we need to upload that file into that url and upload
export const uploadLargeFileVirusTotal = async (filePath, uploadUrl) => {
    try {
        const fileName = filePath.split("/").pop().split("\\").pop()

        // read file as buffer and convert to Blob
        const fileBuffer = await fs.promises.readFile(filePath)
        const blob = new Blob([fileBuffer])

        console.log("[VT] Uploading to URL:", uploadUrl)
        console.log("[VT] File size:", fileBuffer.length)

        const formData = new FormData()
        formData.append("file", blob, fileName)

        const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "x-apikey": VT_API_KEY,
            },
            body: formData
        })


        const data = await response.json()
        return data.data?.id   // return for the ananlysis

    } catch (error) {
        throw new Error(`Large file upload failed: ${error.message}`)
    }
}



//  here virus total poll for analysis
export const pollAnalysisResult = async (analysisId) => {
    const MAX_POLL = 20   // max 20 attempts
    const POLL_INTERVAL = 15000   // every 15 second here

    for (let i = 0; i < MAX_POLL; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL))

        try {
            const response = await fetch(`${VT_BASE_URL}/analyses/${analysisId}`, {
                headers: vtHeaders
            })
            if (response.status === 429) {
                console.log("[VirusTotal] Rate limited, retrying...")
                continue
            }

            const data = await response.json()
            const status = data.data?.attributes?.status

            // if can is completed
            if (status === "completed") {
                const stats = data.data?.attributes?.stats
                const malicious = stats?.malicious || 0;
                const suspicious = stats?.suspicious || 0

                return {
                    clean: malicious === 0 && suspicious === 0,     // if file is clean no virus
                    malicious,
                    suspicious,
                    virusName: data.data?.attributes?.results
                        ? Object.values(data.data.attributes.results)
                            .find(r => r.category === "malicious")?.result || null
                        : null
                }
            }

            console.log(`[VirusTotal] Poll ${i + 1}/${MAX_POLLS} - status: ${status}`)

        } catch (error) {
            console.error(`[VirusTotal] Poll error:`, error.message)
        }
    }

    throw new Error("VirusTotal analysis timed out")
}