// src/utils/chromeNotificationUtils.js
import BrandSmallIcon from "@images/small-logo.svg";

let navigateFn = null

export const setNavigateFunction = (fn) => {
    navigateFn = fn
}

// Memory cache so each SVG is converted to PNG only ONCE (0ms on repeat)
const iconCache = {}


// Dynamically converts an SVG URL to a PNG Data URL using Canvas

export const convertSvgToPng = (svgUrl) => {
    if (!svgUrl) return Promise.resolve(undefined)
    if (iconCache[svgUrl]) return Promise.resolve(iconCache[svgUrl])

    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = "Anonymous"

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas")
                canvas.width = 128
                canvas.height = 128
                const ctx = canvas.getContext("2d")
                ctx.drawImage(img, 0, 0, 128, 128)

                const pngDataUrl = canvas.toDataURL("image/png")
                iconCache[svgUrl] = pngDataUrl
                resolve(pngDataUrl)
            } catch (err) {
                console.warn("[ChromeNotification] Canvas conversion error:", err)
                resolve(undefined)
            }
        }

        img.onerror = () => {
            resolve(undefined)
        }

        img.src = svgUrl
    })
}

/**
 * Request notification permission from browser
 */
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notifications.")
        return false
    }

    if (Notification.permission === "granted") {
        return true
    }

    if (Notification.permission !== "denied") {
        try {
            const permission = await Notification.requestPermission()
            return permission === "granted"
        } catch (error) {
            console.error("Error requesting notification permission:", error)
            return false
        }
    }

    return false
}

/**
 * Show a native Desktop Notification with your main DocSpot Logo
 */
export const showDesktopNotification = async ({
    title = "Docspot",
    body = "",
    icon = BrandSmallIcon,
    onClickUrl = null
}) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return
    }

    // Convert SVG logo to PNG
    let convertedIcon = undefined
    if (icon) {
        convertedIcon = await convertSvgToPng(icon)
    }

    const notification = new Notification(title, {
        body,
        icon: convertedIcon
    })

    notification.onclick = (event) => {
        event.preventDefault()
        window.focus()

        if (onClickUrl) {
            if (navigateFn) {
                navigateFn(onClickUrl)
            } else {
                window.location.href = onClickUrl
            }
        }

        notification.close()
    }
}

/**
 * Dedicated helper to format text (User name + File/Folder name) and show Share Notification
 */
export const showShareNotification = ({
    senderName,
    itemNames = [],
    itemTypes = [],
    message = "",
    onClickUrl = "/dashboard"
}) => {
    // 1. Build text: "Mihir shared "report.pdf" with you" OR "Mihir shared "Projects" folder with you"
    let bodyText = message
    if (senderName && itemNames && itemNames.length > 0) {
        if (itemTypes && itemTypes[0] === "folder") {
            bodyText = `${senderName} shared "${itemNames[0]}" folder with you`
        } else {
            bodyText = `${senderName} shared "${itemNames[0]}" with you`
        }
    }

    // 2. Trigger desktop notification with ONLY your main Docspot logo
    return showDesktopNotification({
        title: "Docspot",
        body: bodyText,
        icon: BrandSmallIcon,
        onClickUrl
    })
}

export const shouldUseNativeNotification = () => {
    return document.hidden || document.visibilityState !== "visible"
}

