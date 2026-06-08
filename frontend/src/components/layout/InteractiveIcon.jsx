import React, { useState, forwardRef } from "react";

const InteractiveIcon = forwardRef(
    (
        {
            defaultIcon,
            hoverIcon,
            activeIcon,
            isActive = false,
            alt = "",
            className = "",
            onClick,
            renderAs = "img",
            customStyle = {},
            ...rest
        },
        ref
    ) => {
        const [isHovered, setIsHovered] = useState(false);

        const resolveIcon = () => {
            if (isActive && activeIcon) return activeIcon;
            if (isHovered && hoverIcon) return hoverIcon;
            return defaultIcon;
        };

        const Component = renderAs;
        const isImg = Component === "img";

        return (
            <Component
                ref={ref}
                {...(isImg && {
                    src: resolveIcon(),
                    alt: alt,
                })}
                className={className}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onClick}
                style={{ cursor: "pointer", ...customStyle }}
                {...rest}
            />
        );
    }
);

export default InteractiveIcon;