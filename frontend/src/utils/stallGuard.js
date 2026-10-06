export const STALL_TIMEOUT = 25000 // 25 seconds of no bytes = stalled

// Helper to pause execution until device reconnects to Wi-Fi/Internet (up to timeoutMs)
export const waitForOnline = (timeoutMs = 60000) => {
    return new Promise((resolve) => {
        if (typeof navigator === "undefined" || navigator.onLine) return resolve(true)

        let timer = null
        const onOnline = () => {
            cleanup()
            resolve(true)
        }
        const cleanup = () => {
            clearTimeout(timer)
            window.removeEventListener("online", onOnline)
        }

        timer = setTimeout(() => {
            cleanup()
            resolve(false)
        }, timeoutMs)

        window.addEventListener("online", onOnline)
    })
}

export const createStallGuard = (parentSignal, timeout = STALL_TIMEOUT) => {
    const controller = new AbortController()
    let lastActivity = Date.now()
    let stalled = false

    const onParentAbort = () => controller.abort()
    if (parentSignal) {
        if (parentSignal.aborted) controller.abort()
        else parentSignal.addEventListener("abort", onParentAbort)
    }

    const timer = setInterval(() => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            lastActivity = Date.now() // Don't count offline time as a stall
            return
        }

        if (Date.now() - lastActivity > timeout) {
            stalled = true
            controller.abort(new Error("Connection stalled"))
        }
    }, 2000)

    return {
        signal: controller.signal,
        touch: () => { lastActivity = Date.now() },
        isStalled: () => stalled,
        cleanup: () => {
            clearInterval(timer)
            parentSignal?.removeEventListener("abort", onParentAbort)
        }
    }
}

