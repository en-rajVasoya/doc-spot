import { useState, useRef, useEffect } from "react";
import { Modal, Form, Dropdown } from "react-bootstrap";
import Tooltip from "../layout/Tooltip.jsx";
import InteractiveIcon from "../layout/InteractiveIcon";
import userProfileIcon from "@images/svgs/user-profile.svg"
import { useFileExplorer } from "../../context/FileExplorerContext";
import searchIcon from "@images/icon/search.svg";
import CustomSelect from "../layout/CustomSelect";
import axiosApi from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import passwordIcon from "@images/icon/password.svg";
import publicLinkIcon from "@images/icon/public-link.svg";
import arrowDownIcon from "@images/icon/arrow-down.svg";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import viewIcon from "@images/icon/view.svg";
import viewHideIcon from "@images/icon/view-hide.svg";
import copyLinkIcon from "@images/icon/copy-link.svg";
import closeIcon from "@images/icon/close-icon.svg"

import UserAvatar from "../layout/UserAvatar.jsx";

import useResponsive from '../../hooks/useResponsive';
import CopyLinkSection from "./CopyLinkSection.jsx";

//  helper to copy link 
import { generateShareLinks } from "../../utils/generateShareLinks.js";
import { useNotification } from "../../context/NotificationContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";

const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";


function ShareUserModal({ data, onClose, setModal }) {
    const [loading, setLoading] = useState(true);
    const { searchUsersApi, unshareItemApi, shareItemApi, selectedIds, getSuggestedUsersApi, updateSharedWith, suggestedUsers, suggestedHasMore, sharedUsersData, loadSharedUsers, clearSharedUsers } = useFileExplorer()

    const { user } = useAuth()
    const { showNotification } = useNotification()
    const { socket } = useSocket()


    const { isMobile, isTablet, isDesktop } = useResponsive();

    const owner = sharedUsersData.owner
    const sharedWith = sharedUsersData.sharedWith
    const inheritedFolderOwner = sharedUsersData.inheritedFolderOwner


    // // safely handle if data is an array (multiple items selected) or object (single item)
    // const itemId = Array.isArray(data) ? data[0] : (data?._id || [...selectedIds][0]);
    // const allSelectedIds = Array.isArray(data) ? data : (data ? [data._id] : [...selectedIds]);

    const allSelectedItems = Array.isArray(data) ? data : [data]
    const itemId = allSelectedItems[0]?._id
    // this maps the objects to strings so your shareItemApi doesn't break!
    const allSelectedIds = allSelectedItems.map(item => item._id);

    // shake animation state for when user clicks outside the modal
    const [shake, setShake] = useState(false)
    const modalRef = useRef(null)
    const mobileToggleRef = useRef(null)
    const desktopToggleRef = useRef(null)

    // search inputs and search results
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState([])

    // selected users to add (map of userId => { user, permission })
    const [selectedUsers, setSelectedUsers] = useState(new Map())

    // tracks if link is "restricted" (people with access) or "public" (anyone)
    const [accessType, setAccessType] = useState("restricted")

    // link configuration states (expiry dates and passwords)
    const [expiryDay, setExpiryDay] = useState(null)
    const [linkExpiry, setLinkExpiry] = useState(false)
    const [passwordProtect, setPasswordProtect] = useState(false)
    const [password, setPassword] = useState("")
    const [savedPassword, setSavedPassword] = useState("")
    const [passwordShow, setPasswordShow] = useState(false)

    const [isFocused, setIsFocused] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    // default permission dropdown state
    const [permission, setPermission] = useState("viewer")

    //  this state for when user update user permisison on the child item
    const [inheritedConfirmModal, setInheritedConfirmModal] = useState(null)



    //  this state is used for the suggested user show in this modal when user click on the input
    const [inputFocused, setInputFocused] = useState(false)
    const suggestedPageRef = useRef(1)
    const [loadingMore, setLoadingMore] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const itemRefs = useRef([])

    useEffect(() => {
        setActiveIndex(-1)
    }, [searchTerm, inputFocused, searchResults])

    useEffect(() => {
        if (activeIndex >= 0) {
            itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
        }
    }, [activeIndex])


    //  here this two state for the if anyy existing copy link exist 
    const [existingLinkInfo, setExistingLinkInfo] = useState(null);
    const [loadingLinkInfo, setLoadingLinkInfo] = useState(true);


    // automatically fetch the existing shared users for this item when modal opens
    useEffect(() => {
        if (!itemId) return;
        setLoading(true);
        loadSharedUsers(itemId).finally(() => setLoading(false));

        // clear when modal unmounts / itemId changes
        return () => clearSharedUsers();
    }, [itemId]);


    //  this use effect for the fetching the exsiting copy link if any exist in backend
    useEffect(() => {
        if (!itemId) return

        const fetchLinkInfo = async () => {
            try {
                const res = await axiosApi.get(`/links/info?item_id=${itemId}`)
                if (res.data?.success && res.data?.exists) {
                    const info = res.data.data
                    setExistingLinkInfo(info)

                    // Pre-fill dropdowns and checkboxes based on existing settings
                    setAccessType(info.is_public ? "public" : "restricted")
                    setPasswordProtect(Boolean(info.has_password))
                    if (info.password) {
                        setPassword(info.password)
                        setSavedPassword(info.password)
                    } else {
                        setPassword("")
                        setSavedPassword("")
                    }

                    if (info.expire_date) {
                        setLinkExpiry(true)
                        const expireDate = new Date(info.expire_date);
                        const now = new Date();
                        const diffTime = Math.max(0, expireDate - now);
                        const diffMinutes = Math.round(diffTime / (1000 * 60));
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        const matchedOption = expiryDayOption.find(opt => parseInt(opt.value) === diffDays)
                            || expiryDayOption.find(opt => parseInt(opt.value) >= diffDays)
                            || expiryDayOption[0];
                        setExpiryDay(matchedOption)
                    }
                } else {
                    setExistingLinkInfo(null)
                    setAccessType("restricted")
                    setPasswordProtect(false)
                    setLinkExpiry(false)
                    setExpiryDay(null)
                }
            } catch (err) {
                console.error("Error fetching existing link info:", err);
            }
        }

        fetchLinkInfo()

    }, [itemId])



    // run search api automatically when user types in the search bar
    useEffect(() => {
        // don't search if less than 2 characters
        if (searchTerm.trim().length < 2) {
            setSearchResults([])
            return
        }

        // debounce the search (wait 300ms before calling backend) to prevent spamming
        const timeout = setTimeout(async () => {
            const results = await searchUsersApi(searchTerm)
            setSearchResults(results)
        }, 300)
        return () => clearTimeout(timeout)
    }, [searchTerm])



    //  when share user modal opens so thsi will fetch suggested users here
    useEffect(() => {
        if (!itemId) return
        suggestedPageRef.current = 1
        getSuggestedUsersApi(itemId, 1)
    }, [itemId])



    //  thi fucntino is used for the when user change the permision to child item 
    const handleConfirmInheritedChange = async () => {
        if (!inheritedConfirmModal) return
    }

    // Helper to generate a random 8-character numeric password to bypass the strict backend validator!
    const generateRandomPassword = () => {
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const special = "!@#$%^&*?";

        let password = "";

        // Ensure one character from each required category
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Fill the remaining 4 positions with random characters from all sets
        const allChars = uppercase + lowercase + numbers + special;
        for (let i = 0; i < 4; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password so required chars aren't predictably positioned
        password = password.split('').sort(() => Math.random() - 0.5).join('');

        setPassword(password);
        setPasswordShow(true); // Show the generated password
    }

    // checks if the currently logged-in user is the owner of the item
    const isOwner = owner && user && String(owner.userId) === String(user._id);

console.log("data : ", data)
console.log("allSelectedItems[0]:",allSelectedItems[0])
console.log("sharedWith : ",sharedWith)
    // Get current user's permission for this item
    const currentUserEntry = sharedWith.find(s => String(s.userId || s._id) === String(user?._id))
    console.log("currentUserEntry :",currentUserEntry)
    const currentPermission = sharedUsersData.permission
    || data?.permission
    || allSelectedItems[0]?.permission
    || (isOwner ? "owner" : currentUserEntry?.permission)
console.log("currentPermission : ", currentPermission)
    // Allow sharing if user is Owner OR Editor
    const canShare = isOwner || currentPermission === "editor" || currentPermission === "owner";
console.log("canShare :",canShare)

    // Fixed: React-Select portal click
    const handleOutsideClick = (e) => {
        // React-Select dropdown
        const isReactSelect =
            e.target.closest('[class*="-menu"]') ||
            e.target.closest('[class*="-option"]') ||
            e.target.closest('[class*="-control"]') ||
            e.target.closest('[class*="-MenuList"]') ||
            e.target.closest('[class^="css-"]')

        if (isReactSelect) return;

        if (modalRef.current && !modalRef.current.contains(e.target)) {
            if (isMobile) {
                onClose()
            } else {
                setShake(true)
                setTimeout(() => setShake(false), 400)
            }

        }
    }

    //  this will help in the ading the all users in the copy link 
    const buildUpdatedUserIds = ({ add = null, remove = null } = {}) => {
        let ids = [
            ...sharedWith.map(s => s.userId || s._id),
            ...Array.from(selectedUsers.keys()),
            owner?.userId || owner?._id,
            user?._id
        ].filter(Boolean)
        if (add) ids.push(add)
        if (remove) ids = ids.filter(id => String(id) !== String(remove))
        return Array.from(new Set(ids.map(id => String(id))))
    }

    // adds a user from search results to the selected list
    const handleSelectUser = async (user) => {
        // Bypass the pending stage and instantly share
        /*
        setSelectedUsers(prev => {
            const next = new Map(prev)
            // default their permission to whatever is in the main dropdown
            next.set(user._id, { user, permission })
            return next
        })
        */

        // clear search box after selecting
        setSearchTerm("")
        setSearchResults([])
        setInputFocused(false)
        setActiveIndex(-1)
        document.activeElement?.blur()

        //  when user is selected from search bar so instant share with the other user
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
        await shareItemApi(itemIds, [user._id], "viewer")

        // instantly refresh the modal's sharedWith list so they appear in the main list
        // (Handled by the share_added socket listener now to save API calls)

        if (existingLinkInfo && accessType === "restricted") {
            await saveLinkSettings({
                user_ids: buildUpdatedUserIds({ add: user._id }),
                skipToast: true
            })
        }
    }


    // removes a user from the newly selected list (clicking the 'X' button)
    const handleRemoveSelected = async (userId) => {
        setSelectedUsers(prev => {
            const next = new Map(prev)
            next.delete(userId)
            return next
        })

        //  instant remove user when user close icon click
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
        await unshareItemApi(itemIds, [userId])

        if (existingLinkInfo && accessType === "restricted") {
            await saveLinkSettings({
                user_ids: buildUpdatedUserIds({ remove: userId }),
                skipToast: true
            })
        }
    }



    // remove a user completely from the shared access list
    const handleUnshare = async (userId) => {
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
        await unshareItemApi(itemIds, [userId])
        // socket event (share_removed) will trigger loadSharedUsers automatically via context

        if (existingLinkInfo && accessType === "restricted") {
            await saveLinkSettings({
                user_ids: buildUpdatedUserIds({ remove: userId }),
                skipToast: true
            })
        }
    }


    //  so here if link goes from private to the public here so null all public features
    const handleAccessTypeChange = (newType) => {
        setAccessType(newType)
        if (newType === "public") {
            setLinkExpiry(false)
            setExpiryDay(null)
            setPasswordProtect(false)
            setPassword("")
        }
    }

    //  this fucntion is used for updaet copy link feature when it is update
    const saveLinkSettings = async (overrides = {}) => {
        try {
            if (allSelectedItems.length === 0) return;

            //  if any thing updaet here so updaet other wise defualt value
            const targetAccessType = overrides.accessType ?? accessType;
            const targetLinkExpiry = overrides.linkExpiry ?? linkExpiry;
            const targetExpiryDay = overrides.expiryDay ?? expiryDay;
            const targetPasswordProtect = overrides.passwordProtect ?? passwordProtect;
            const targetPassword = overrides.password ?? savedPassword;

            let generatedLinks = []

            //  if here links already exist then other wise dotn execute this block  
            if (allSelectedItems.length === 1 && existingLinkInfo && existingLinkInfo.link && String(existingLinkInfo.item_id) === String(allSelectedItems[0]._id)) {
                generatedLinks = [{
                    link: existingLinkInfo.link,
                    type: allSelectedItems[0].type,
                    item_id: allSelectedItems[0]._id
                }]
            } else {
                generatedLinks = generateShareLinks(allSelectedItems);
            }


            const payload = {
                links: generatedLinks,
                is_public: targetAccessType === "public",
                user_ids: targetAccessType === "restricted" ? (overrides.user_ids ?? (() => {
                    const ids = [
                        ...sharedWith.map(s => s.userId),
                        ...Array.from(selectedUsers.keys()),
                        user._id
                    ];
                    return ids.length > 0 ? ids : [user._id];
                })()) : []
            };


            if (targetLinkExpiry && targetExpiryDay) {
                const date = new Date();
                date.setDate(date.getDate() + parseInt(targetExpiryDay.value));
                payload.expire_date = date.toISOString();
            } else {
                payload.expire_date = "";
            }


            if (targetAccessType === "public") {
                if (targetPasswordProtect) {
                    if (!targetPassword) {
                        setPasswordError(true);
                        return;
                    }
                    if (targetPassword) {
                        const isPasswordValid = [
                            /[A-Z]/.test(targetPassword),
                            /[a-z]/.test(targetPassword),
                            /[0-9]/.test(targetPassword),
                            /[!@#$%^&*?]/.test(targetPassword),
                            targetPassword.length >= 8,
                        ].every(Boolean);
                        if (!isPasswordValid) {
                            setPasswordError(true);
                            return;
                        }
                        payload.password = targetPassword;
                    }
                } else {
                    payload.password = "";
                }
            }

            const response = await axiosApi.post("/links/store", payload);

            if (response.data?.success && response.data?.data?.[0]) {
                const saved = response.data.data[0];
                if (saved.password) {
                    setSavedPassword(saved.password);
                }
                setExistingLinkInfo({
                    _id: saved._id,
                    item_id: saved.item_id,
                    token: saved.token,
                    link: saved.link,
                    type: saved.type,
                    is_public: saved.is_public,
                    has_password: Boolean(saved.password),
                    expire_date: saved.expire_date,
                    is_expired: saved.is_expired,
                });

                if (existingLinkInfo && !overrides.skipToast) {
                    showNotification("Access updated", "success", "bottom-center");
                }
            }

            return generatedLinks;

        } catch (error) {
            console.error("Error saving link settings:", error);
            showNotification("Failed to update link", "error", "bottom-center");
            return null;
        }
    }

    // copy link handler
    // copy link handler
    const handleCopyLink = async () => {
        if (accessType === "public" && passwordProtect) {
            // second time+: link already exists, so only the CONFIRMED (savedPassword) counts.
            // if the visible field doesn't match it, user edited/cleared it without clicking "Set password" — block.
            if (existingLinkInfo && password !== savedPassword) {
                setPasswordError(true);
                return;
            }
            // first time: no link yet, so whatever's typed must at least be non-empty
            if (!existingLinkInfo && !password) {
                setPasswordError(true);
                return;
            }
        }

        const generatedLinks = await saveLinkSettings({ skipToast: true });
        if (!generatedLinks) return;

        const linksText = generatedLinks.map(l => l.link).join(", ");
        await navigator.clipboard.writeText(linksText);
        showNotification("Link Copied", "success", "bottom-center");
    };





    // options for brand new users you are adding
    const shareFileEditOptions = [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
    ];

    // options for users who already have access (includes the remove option)
    const shareFileEditOptionsTwo = [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
        { value: "remove", label: "Remove from shared" },
    ];

    // options for users with inherited access (disabled remove option)
    const shareFileEditOptionsInherited = [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
        { value: "remove", label: "Remove from shared", isDisabled: true },
    ];

    // link expiry preset options
    const expiryDayOption = [
        // { value: "2m", label: "2 Minutes (Test)" },
        { value: "1", label: "1 Day" },
        { value: "7", label: "7 Day" },
        { value: "30", label: "30 Day" },
    ];

    if (loading) {
        return (
            <div className="loader-wrapper-box p-4">
                <div className="cma-messages-are-loader-wrapper">
                    <span className="loader"></span>
                </div>
            </div>
        );
    }
    // Filter out users who already have access or are currently selected
    const filterOutExistingUsers = (usersToFilter) => {
        return usersToFilter.filter(user => {
            const isOwnerMatch = owner && String(owner.userId) === String(user._id);
            const isShared = sharedWith.some(s => String(s.userId) === String(user._id));
            const isSelected = selectedUsers.has(String(user._id));
            return !isOwnerMatch && !isShared && !isSelected;
        });
    };

    const filteredSuggestedUsers = filterOutExistingUsers(suggestedUsers);
    const filteredSearchResults = filterOutExistingUsers(searchResults);

    const visibleUsers = (inputFocused && canShare && searchTerm.trim().length === 0)
        ? filteredSuggestedUsers
        : (searchTerm.trim().length >= 2 ? filteredSearchResults : [])

    const handleSuggestedScroll = async (e) => {
        const el = e.currentTarget
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
        if (!nearBottom || !suggestedHasMore || loadingMore) return

        setLoadingMore(true)
        try {
            const next = suggestedPageRef.current + 1
            const result = await getSuggestedUsersApi(itemId, next)
            if (result) suggestedPageRef.current = next
        } finally {
            setLoadingMore(false)
        }
    }

    const handleKeyDown = (e) => {
        if (visibleUsers.length === 0) return

        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIndex(prev => (prev + 1) % visibleUsers.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIndex(prev => (prev <= 0 ? visibleUsers.length - 1 : prev - 1))
        } else if (e.key === "Enter" && activeIndex >= 0 && visibleUsers[activeIndex]) {
            e.preventDefault()
            handleSelectUser(visibleUsers[activeIndex])
        } else if (e.key === "Escape") {
            setInputFocused(false)
        }
    }



    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-md ${shake ? 'shake' : ''}`}
                id="share"
            >

                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Shared with people</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button
                                className="btn-only-icon"
                                onClick={onClose}
                            >
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="add" />
                            </button>
                        </Tooltip>
                    </Modal.Header>
                    <Modal.Body>
                        {/* EVERYONE sees this structure, but we disable inputs if not owner */}
                        <>
                            <div className="search-box-sec" style={{ opacity: !canShare ? 0.7 : 1 }}>
                                <Form.Group className="mb-0">
                                    <div className="form-control-single-icon">
                                        <InteractiveIcon
                                            defaultIcon={searchIcon}
                                            width={24}
                                            height={24}
                                            className="form-left-icon"
                                        />
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => setInputFocused(true)}
                                            onClick={() => setInputFocused(true)}
                                            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                                            className='custom-form-control h-36'
                                            disabled={!canShare}
                                        />
                                    </div>
                                </Form.Group>
                                <h3 className="modal-title-sub">Shared with people</h3>

                                {/* Show the dropdown list for suggested users or search results */}
                                {visibleUsers.length > 0 && (
                                    <div
                                        className="input-dd"
                                        onScroll={handleSuggestedScroll}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <ul className="mb-0 py-2">
                                            {visibleUsers.map((user, index) => (
                                                <li
                                                    key={user._id}
                                                    ref={el => itemRefs.current[index] = el}
                                                    className={index === activeIndex ? "active-user" : ""}
                                                    onMouseEnter={() => setActiveIndex(index)}
                                                    onMouseDown={() => handleSelectUser(user)}
                                                >
                                                    <div className="share-user-list-dd d-flex align-items-center cursor-pointer p-2">
                                                        <div className='profile-single-box'>
                                                            <UserAvatar user={user} />
                                                        </div>
                                                        <div className="ms-2 ps-1">
                                                            <p className="user-name mb-0">{user.name}</p>
                                                            <p className="user-email mb-0 small text-muted">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                            {loadingMore && (
                                                <li className="d-flex justify-content-center align-items-center py-2">
                                                    <div className="cma-messages-are-loader-wrapper" style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
                                                        <span className="loader"></span>
                                                    </div>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="position-relative">
                                <div className="share-user-shade"></div>
                                <div className="share-user-shade2"></div>

                                {/* Show the list of NEW users waiting to be shared */}
                                {/* [PENDING STAGE HIDDEN] */}
                                {false && selectedUsers.size > 0 && (
                                    <>
                                        {/* mapping selected pending users */}

                                        <ul className="share-user-container">
                                            {[...selectedUsers.entries()].map(([userId, { user, permission }]) => (
                                                <li key={userId}>
                                                    <div className="share-user-list d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <div className="share-user-profilepic">
                                                                {/* <InteractiveIcon
                                                                        defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                        width={48}
                                                                        height={48}
                                                                    /> */}
                                                                <UserAvatar user={user} />
                                                            </div>
                                                            <div className="ms-2 ps-1">
                                                                <p className="user-name mb-0">{user.name}</p>
                                                                <p className="user-email mb-0 small text-muted">{user.email}</p>
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-center gap-2">
                                                            <Form.Group className="m-0" onClick={(e) => e.stopPropagation()}>
                                                                <CustomSelect
                                                                    options={shareFileEditOptions}
                                                                    isSearchable={false}
                                                                    showIndicatorSeparator={false}
                                                                    value={shareFileEditOptions.find(opt => opt.value === permission)}
                                                                    onChange={async (val) => {
                                                                        setSelectedUsers(prev => {
                                                                            const next = new Map(prev);
                                                                            next.set(userId, { user, permission: val.value });
                                                                            return next;
                                                                        });
                                                                        //  when user permission change so instant change
                                                                        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
                                                                        await shareItemApi(itemIds, [userId], val.value)
                                                                    }}
                                                                    placeholder="Select permission"
                                                                />
                                                            </Form.Group>
                                                            <button className="btn-only-icon ms-2" onClick={() => handleRemoveSelected(userId)}> <InteractiveIcon defaultIcon={closeIcon} width={22} alt="close" /></button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                    </>
                                )}

                                <ul className="share-user-container">
                                    {/* Always show the owner at the top of the list */}
                                    {owner && (
                                        <li>
                                            <div className="share-user-list d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    <div className="share-user-profilepic">
                                                        {/* <InteractiveIcon
                                                                defaultIcon={owner.profilePic ? `${BASE_URL}${owner.profilePic}` : userProfileIcon}
                                                                width={48}
                                                                height={48}
                                                            /> */}
                                                        <UserAvatar user={owner} />
                                                    </div>
                                                    <div className="ms-2 ps-1">
                                                        <p className="user-name mb-0">{owner.name}</p>
                                                        <p className="user-email mb-0 small text-muted">{owner.email}</p>
                                                    </div>
                                                </div>
                                                <p className="owner-tag mb-0">Owner</p>
                                            </div>
                                        </li>
                                    )}

                                    {/* her ethis is for shwoing me the editor info */}
                                    {inheritedFolderOwner && (String(inheritedFolderOwner.userId || inheritedFolderOwner._id)) !== String(owner?.userId || owner?._id) && (
                                        <li>
                                            <div className="share-user-list d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    <div className="share-user-profilepic">
                                                        <UserAvatar user={inheritedFolderOwner} />
                                                    </div>
                                                    <div className="ms-2 ps-1">
                                                        <p className="user-name mb-0">{inheritedFolderOwner.name}</p>
                                                        <p className="user-email mb-0 small text-muted">{inheritedFolderOwner.email}</p>
                                                    </div>
                                                </div>
                                                <p className="owner-tag mb-0">Folder Owner</p>
                                            </div>
                                        </li>
                                    )}

                                    {/* mapping existing shared users - sorted so logged-in user (You) appears right after Owner / Folder Owner */}
                                    {sharedWith
                                        .filter(s => (!owner || String(s.userId) !== String(owner.userId)) && !selectedUsers.has(String(s.userId)))
                                        .reverse() // Reverse so newest added users appear at the top
                                        .sort((a, b) => {
                                            const isASelf = String(a.userId) === String(user?._id);
                                            const isBSelf = String(b.userId) === String(user?._id);
                                            if (isASelf) return -1;
                                            if (isBSelf) return 1;
                                            return 0;
                                        })
                                        .map(s => {
                                            const isUserOwner = String(s.userId) === String(owner?.userId);
                                            const isUserSelf = String(s.userId) === String(user?._id);
                                            const isDisabled = !canShare || (!isOwner && (isUserOwner || isUserSelf));

                                            return (
                                                <li key={s.userId}>
                                                    <div className="share-user-list d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <div className="share-user-profilepic">
                                                                <UserAvatar user={s} />
                                                            </div>
                                                            <div className="ms-2 ps-1">
                                                                <p className="user-name mb-0">{s.name}</p>
                                                                <p className="user-email mb-0 small text-muted">{s.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            {isDisabled ? (
                                                                <p className="owner-tag mb-0" style={{ textTransform: "capitalize" }}>
                                                                    {s.permission === "editor" ? "Editor" : "Viewer"}
                                                                </p>
                                                            ) : (
                                                                <Form.Group
                                                                    className="m-0"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <CustomSelect
                                                                        options={(s.inherited || s.hasParentAccess) ? shareFileEditOptionsInherited : shareFileEditOptionsTwo}
                                                                        isSearchable={false}
                                                                        showIndicatorSeparator={false}
                                                                        value={((s.inherited || s.hasParentAccess) ? shareFileEditOptionsInherited : shareFileEditOptionsTwo).find(opt => opt.value === s.permission)}
                                                                        isOptionDisabled={(option) => option.isDisabled}
                                                                        styles={{
                                                                            control: (base) => ({ ...base, minWidth: '130px' }),
                                                                            menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%', right: 0 }),
                                                                            option: (base, state) => ({
                                                                                ...base,
                                                                                whiteSpace: 'nowrap',
                                                                                opacity: state.isDisabled ? 0.5 : 1,
                                                                                cursor: state.isDisabled ? 'not-allowed' : 'pointer'
                                                                            })
                                                                        }}
                                                                        onChange={async (val) => {
                                                                            if (val.value === s.permission) return;
                                                                            // Open InheritedShareModal via ModalManager

                                                                            if (val.value === "remove") {
                                                                                handleUnshare(s.userId);
                                                                                return;
                                                                            }
                                                                            const itemIdsToUpdate = allSelectedIds.length > 1 ? allSelectedIds : [itemId];

                                                                            //  if we are in the nested child of any root folder so open this modal for user conformation
                                                                            if (inheritedFolderOwner) {
                                                                                setModal({
                                                                                    type: "ShareInheritedModel", // Opens your global modal
                                                                                    data: {
                                                                                        user: s,
                                                                                        newPermission: val.value,
                                                                                        itemIdsToUpdate: itemIdsToUpdate,
                                                                                        folderName: allSelectedItems[0]?.name || allSelectedItems[0]?.originalname
                                                                                    }
                                                                                });
                                                                                return; // Stop here and wait for the user to click Confirm in the modal
                                                                            }

                                                                            await shareItemApi(itemIdsToUpdate, [s.userId], val.value, true);
                                                                        }}
                                                                        placeholder="Select permission"
                                                                    />
                                                                </Form.Group>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                </ul>
                            </div>
                        </>



                        {/* Render CopyLinkSection component */}
                        <CopyLinkSection
                            accessType={accessType}
                            setAccessType={handleAccessTypeChange}
                            expiryDay={expiryDay}
                            setExpiryDay={setExpiryDay}
                            linkExpiry={linkExpiry}
                            setLinkExpiry={setLinkExpiry}
                            passwordProtect={passwordProtect}
                            setPasswordProtect={setPasswordProtect}
                            password={password}
                            setPassword={setPassword}
                            savedPassword={savedPassword}
                            setSavedPassword={setSavedPassword}
                            passwordShow={passwordShow}
                            setPasswordShow={setPasswordShow}
                            isFocused={isFocused}
                            setIsFocused={setIsFocused}
                            passwordError={passwordError}
                            setPasswordError={setPasswordError}
                            canShare={canShare}
                            isMobile={isMobile}
                            saveLinkSettings={saveLinkSettings}
                            existingLinkInfo={existingLinkInfo}
                        />

                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="modal-add-new-btn" onClick={handleCopyLink} disabled={!canShare} style={{ opacity: !canShare ? 0.5 : 1, cursor: !canShare ? 'not-allowed' : 'pointer' }}>
                            <InteractiveIcon defaultIcon={copyLinkIcon} width={24} alt="add" />
                            Copy link
                        </button>
                        <div className="modal-footer-btn-group">
                            <button className="btn-secondary btn-lg m-0" onClick={onClose}>Close</button>
                            {/* Button is disabled if there are no specific users selected in the list (meaning nothing new to save) */}
                            <button
                                className="btn-black btn-lg m-0"
                                onClick={onClose}
                            >
                                Done
                            </button>
                        </div>
                    </Modal.Footer>

                </div>
            </Modal>
        </div>
    )
}

export default ShareUserModal

