import React, { useMemo } from 'react';
import profileImageIcon from "@images/icon/profile-image-icon.svg";

// Vite tells us if we are running 'npm run dev' or a production build
const isDevMode = import.meta.env.DEV;

// Backend URL only matters in production (separate server case)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

// In dev -> empty string (Vite proxy handles same-origin forwarding)
// In prod -> full backend URL (works whether same server or separate server)
const basePath = isDevMode ? "" : BACKEND_URL;

const AVATAR_COLORS = [
    "#FFC400A8", "#FF8A00A8", "#49BA14A8", "#EA3843A8", "#398415A8",
    "#263DB8A8", "#00A3EFA8", 
];

const getColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
};

function UserAvatar({ user, name, src, className = "", style = {} }) {
    // 1. Pick a random color when the component first loads (for when the name is blank)
    const randomFallbackColor = useMemo(() => {
        return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    }, []);

    // 2. Check for thumbnail, compressed, or raw profile pic
    const extractedSrc = src || user?.thumbnail_profile_pic || user?.compressed_profile_pic || user?.profilePic;

    // 3. Render image if it exists
    if (extractedSrc) {
        // blob / http(s) / data URLs are already complete -> use as-is
        // otherwise prefix with basePath (empty in dev, full backend URL in prod)
        const finalSrc = extractedSrc.startsWith("blob:") || extractedSrc.startsWith("http") || extractedSrc.startsWith("data:")
            ? extractedSrc
            : `${basePath}${extractedSrc.startsWith('/') ? '' : '/'}${extractedSrc}`;

        return (
            <div className='user-profile-single-box'>
                <img
                    src={finalSrc}
                
                    className={`user-avatar ${className}`}
                    style={style}
                />
            </div>
        );
    }

    // 4. Render colored initials!
    const finalName = name || user?.name || "";
     const hasName = finalName.trim().length > 0;
    const initials = hasName ? finalName.trim().charAt(0).toUpperCase() : null;

    //  here we are generating the user icon colro based on the user id here so in update user it will not change there
    const bgColor = user?._id ? getColorFromName(user._id.toString()) : randomFallbackColor;

    return (
        <div className='user-profile-single-box'>
            <div 
                className={`user-avatar-initials ${className}`} 
                style={{ backgroundColor: hasName ? bgColor : "transparent", ...style }}
            >
            <span className='user-avatar-initials-text'>
                {hasName ? initials : (
                    <span className='btn-only-icon'><img src={profileImageIcon}  width={20} /></span>
                )}
            </span>
            </div>
        </div>
    );
}

export default UserAvatar;








