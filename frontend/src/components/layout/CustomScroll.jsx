import React, { useRef, useEffect, useState } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

function CustomScroll({
    children,
    className = "",
    showTopBlur = true,
    showBottomBlur = true,
    shadowIntensity = 0.2,
}) {
    const scrollRef = useRef(null);

    const [isTop, setIsTop] = useState(true);
    const [isBottom, setIsBottom] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            const scrollTop = el.scrollTop;
            const scrollHeight = el.scrollHeight;
            const clientHeight = el.clientHeight;

            setIsTop(scrollTop <= 0);
            setIsBottom(scrollTop + clientHeight >= scrollHeight - 1);
        };

        el.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    const topShadow = `rgba(0,0,0,${shadowIntensity})`;
    const bottomShadow = `rgba(0,0,0,${shadowIntensity})`;

    return (
        <SimpleBar
            className={`
    ${className}
    ${showTopBlur && !isTop ? "show-top-blur" : ""}
    ${showBottomBlur && !isBottom ? "show-bottom-blur" : ""}
  `}
            scrollableNodeProps={{ ref: scrollRef }}
            style={{
                "--top-shadow": topShadow,
                "--bottom-shadow": bottomShadow,
            }}
        >
            {children}
        </SimpleBar>
    );
}

export default CustomScroll;