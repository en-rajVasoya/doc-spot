import { useEffect, useRef } from "react"

/**
 * useSocketEvent
 *
 * A reusable hook that registers a socket event listener exactly once per socket
 * connection, and always calls the LATEST version of the handler without needing
 * to re-register. This prevents the "10+ listener teardown" bug caused by
 * putting state values directly into useEffect dependency arrays.
 *
 * @param {Socket|null} socket   - The socket.io socket instance from SocketContext
 * @param {string}      event    - The socket event name (e.g. "item_renamed")
 * @param {Function}    handler  - The callback to run when the event fires
 *
 * How it works:
 *  1. handlerRef always holds the latest version of the handler.
 *  2. The actual listener registered on the socket is a stable wrapper
 *     that simply calls handlerRef.current — so it never goes stale.
 *  3. The effect only re-runs when the socket itself changes (login/logout).
 *  4. Cleanup removes ONLY this specific wrapper, leaving other contexts' listeners intact.
 */
export function useSocketEvent(socket, event, handler) {
    // Always keep the latest handler without triggering re-registration
    const handlerRef = useRef(handler)
    handlerRef.current = handler

    useEffect(() => {
        if (!socket || !event) return

        // Stable wrapper — the socket only ever sees this one function
        const listener = (...args) => handlerRef.current?.(...args)

        socket.on(event, listener)

        // Only removes OUR listener, not any other context's listener for the same event
        return () => socket.off(event, listener)

    }, [socket, event]) // Runs once per socket connection, not on every render
}
