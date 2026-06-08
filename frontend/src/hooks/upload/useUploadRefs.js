// this file containes only all ref varible of uplaod context here
import { useRef } from "react"


export function useUploadRefs() {
    const sessionMapsRef = useRef(new Map())
    const uploadQueuesRef = useRef(new Map())
    const uploadStartedRef = useRef(new Map())
    const abortControllersRef = useRef(new Map())
    
    return { sessionMapsRef, uploadQueuesRef, uploadStartedRef, abortControllersRef }
}