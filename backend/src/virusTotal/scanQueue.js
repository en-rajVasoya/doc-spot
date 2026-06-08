const queue = []
const queuedIds = new Set()

let activeScans = 0
const MAX_CONCURRENT = 2

const processQueue = async () => {
    if (activeScans >= MAX_CONCURRENT) return
    if (queue.length === 0) return

    const job = queue.shift()
    activeScans++

    console.log(`[SCAN QUEUE] Starting scan — active: ${activeScans}, remaining: ${queue.length}`)

    try {
        await job()
    } catch (error) {
        console.error("[SCAN QUEUE] Job failed:", error.message)
    } finally {
        activeScans--
        console.log(`[SCAN QUEUE] Scan finished — active: ${activeScans}, remaining: ${queue.length}`)
        processQueue()
    }
}

export const addToScanQueue = (uploadId, job) => {
    if (queuedIds.has(uploadId)) {
        console.log(`[SCAN QUEUE] Duplicate skipped: ${uploadId}`)
        return
    }

    queuedIds.add(uploadId)

    queue.push(async () => {
        try {
            await job()
        } finally {
            queuedIds.delete(uploadId)
        }
    })

    console.log(`[SCAN QUEUE] Job added — queue: ${queue.length}, active: ${activeScans}`)

    while (activeScans < MAX_CONCURRENT && queue.length > 0) {
        processQueue()
    }
}

export const getQueueStats = () => ({
    queued: queue.length,
    active: activeScans,
    max: MAX_CONCURRENT
})