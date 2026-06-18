import React, { useMemo } from 'react';
import profileImageIcon from "@images/icon/profile-image-icon.svg";

// Use your specific backend URL variable!
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const AVATAR_COLORS = [
    "#FFC400", "#FF8A00", "#49BA14", "#EA3843", "#398415",
    "#263DB8", "#00A3EF", 
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
        // If it's a raw File object URL (blob) from the upload, don't append BACKEND_URL
        const finalSrc = extractedSrc.startsWith("blob:") || extractedSrc.startsWith("http") || extractedSrc.startsWith("data:")
            ? extractedSrc
            : `${BACKEND_URL}${extractedSrc.startsWith('/') ? '' : '/'}${extractedSrc}`;

        return (
            <div className='user-profile-single-box'>
                <img
                    src={finalSrc}
                    alt={user?.name || name || ""}
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
                    <span className='btn-only-icon'><img src={profileImageIcon} alt="" width={20} /></span>
                )}
            </span>
            </div>
        </div>
    );
}

export default UserAvatar;








