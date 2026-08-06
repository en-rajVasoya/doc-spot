import { useState, useEffect, useRef, useCallback } from "react";

export function useDragSelect({
    dragRootRef,
    displayItems,
    selectedIds,
    setSelectedIds,
    itemRefs,
    onItemRefsReady
}) {
    const [dragStart, setDragStart] = useState(null);
    const [dragRect, setDragRect] = useState(null);
    const isDragSelectingRef = useRef(false);
    const gridContainerRef = useRef(null);
    const lastMousePos = useRef({ clientX: 0, clientY: 0 });
    const scrollFrameRef = useRef(null);

    const handleMouseDown = useCallback((e) => {
        if (e.target.closest(".master-header")) return;
        if (e.target.closest(".file-preview-modal")) return;
        if (e.target.closest(".table-row")) return;
        if (e.target.closest(".table-header")) return;
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu, .search-suggestion-chip")) return;
        if (e.button !== 0) return;
        isDragSelectingRef.current = true;

        // 1. Save the exact physical mouse position
        lastMousePos.current = { clientX: e.clientX, clientY: e.clientY };
        // 2. Calculate drag start relative to the scroll container's content
        const container = gridContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left + container.scrollLeft;
        const relativeY = e.clientY - containerRect.top + container.scrollTop;
        setDragStart({ x: relativeX, y: relativeY });
        setDragRect(null);
        setSelectedIds(new Set());
    }, [setSelectedIds]);

    const updateSelection = useCallback(() => {
        if (!isDragSelectingRef.current || !dragStart || !gridContainerRef.current) return;

        const { clientX, clientY } = lastMousePos.current;
        const container = gridContainerRef.current;
        const containerRect = container.getBoundingClientRect();

        // 1. Calculate current mouse position relative to the container
        // Constrain the mouse Y position so it cannot go above the container (into the headers)
        const boundedClientY = Math.max(clientY, containerRect.top);

        const currentX = clientX - containerRect.left + container.scrollLeft;
        const currentY = boundedClientY - containerRect.top + container.scrollTop;

        // 2. Calculate the abstract rectangle in container coordinates
        const containerBox = {
            x: Math.min(currentX, dragStart.x),
            y: Math.min(currentY, dragStart.y),
            width: Math.abs(currentX - dragStart.x),
            height: Math.abs(currentY - dragStart.y),
        };

        // 3. Convert the rectangle BACK to viewport coordinates for collision checking
        const viewportBox = {
            x: containerBox.x + containerRect.left - container.scrollLeft,
            y: containerBox.y + containerRect.top - container.scrollTop,
            width: containerBox.width,
            height: containerBox.height,
            left: containerBox.x + containerRect.left - container.scrollLeft,
            top: containerBox.y + containerRect.top - container.scrollTop,
            right: containerBox.x + containerBox.width + containerRect.left - container.scrollLeft,
            bottom: containerBox.y + containerBox.height + containerRect.top - container.scrollTop,
            containerTop: containerRect.top,
        };

        // Render using fixed viewport coordinates so it doesn't get cropped by the container!
        setDragRect(viewportBox);

        const newSelected = new Set();
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return;
            const itemRect = el.getBoundingClientRect();

            const overlaps =
                itemRect.left < viewportBox.right &&
                itemRect.right > viewportBox.left &&
                itemRect.top < viewportBox.bottom &&
                itemRect.bottom > viewportBox.top;

            if (overlaps) newSelected.add(id);
        });

        setSelectedIds(prev => {
            if (prev.size !== newSelected.size) return newSelected;
            for (let id of newSelected) {
                if (!prev.has(id)) return newSelected;
            }
            return prev;
        });
    }, [dragStart, setSelectedIds, itemRefs]);

    const handleMouseMove = useCallback((e) => {
        lastMousePos.current = {
            clientX: e.clientX,
            clientY: e.clientY
        };
        updateSelection();
    }, [updateSelection]);

    const handleMouseUp = useCallback(() => {
        // Stop the drag selection process
        isDragSelectingRef.current = false;
        // Clear the starting coordinates
        setDragStart(null);
        // Remove the visual rectangle box from the screen
        setDragRect(null);
    }, []);

    useEffect(() => {
        onItemRefsReady?.(itemRefs.current);
    }, []);

    useEffect(() => {
        if (!dragStart) return;
        const container = gridContainerRef.current;
        if (!container) return;

        const autoScroll = () => {
            if (!isDragSelectingRef.current) return;

            const { clientY } = lastMousePos.current;
            const rect = container.getBoundingClientRect();
            const edge = 60;
            const speed = 15;

            if (clientY > rect.bottom - edge) {
                container.scrollTop += speed;
            } else if (clientY < rect.top + edge) {
                container.scrollTop -= speed;
            }

            scrollFrameRef.current = requestAnimationFrame(autoScroll);
        };

        scrollFrameRef.current = requestAnimationFrame(autoScroll);

        // When the container scrolls, update the selection using the last known mouse position
        const onScroll = () => {
            updateSelection();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        container.addEventListener("scroll", onScroll);

        return () => {
            if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            container.removeEventListener("scroll", onScroll);
        };
    }, [dragStart, handleMouseMove, handleMouseUp, updateSelection]);

    useEffect(() => {
        // Grab the container element for the main content area
        const root = dragRootRef?.current;
        // If the container doesn't exist yet, do nothing
        if (!root) return;

        // Listen for mouse click inside the container to start the drag selection
        root.addEventListener("mousedown", handleMouseDown);

        // Cleanup function to remove the listener when the component unmounts
        return () => {
            root.removeEventListener("mousedown", handleMouseDown);
        };
    }, [dragRootRef, handleMouseDown]);

    return {
        dragRect,
        handleMouseDown,
        gridContainerRef
    };
}
