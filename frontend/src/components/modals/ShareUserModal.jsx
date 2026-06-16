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

//  helper to copy link 
import { generateShareLinks } from "../../utils/generateShareLinks.js";
import { useNotification } from "../../context/NotificationContext.jsx";

const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";


function ShareUserModal({ data, onClose }) {
    const [loading, setLoading] = useState(true);
    const { searchUsersApi, getSharedUsersApi, shareItemApi, unshareItemApi, selectedIds, getSuggestedUsersApi } = useFileExplorer()
    const { user } = useAuth()
    const { showNotification } = useNotification()

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

    // search inputs and search results
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState([])

    // selected users to add (map of userId => { user, permission })
    const [selectedUsers, setSelectedUsers] = useState(new Map())

    // already shared users fetched from the backend
    const [owner, setOwner] = useState(null)
    const [sharedWith, setSharedWith] = useState([])

    // default permission dropdown state
    const [permission, setPermission] = useState("viewer")

    // tracks if link is "restricted" (people with access) or "public" (anyone)
    const [accessType, setAccessType] = useState("restricted")

    // link configuration states (expiry dates and passwords)
    const [expiryDay, setExpiryDay] = useState(null)
    const [linkExpiry, setLinkExpiry] = useState(false)
    const [passwordProtect, setPasswordProtect] = useState(false)
    const [password, setPassword] = useState("")
    const [passwordShow, setPasswordShow] = useState(false)



    //  this state is used for the suggested user show in this modal when user click on the input
    const [suggestedUsers, setSuggestedUsers] = useState([])
    const [inputFocused, setInputFocused] = useState(false)


    // automatically fetch the existing shared users for this item when modal opens
    useEffect(() => {
        if (!itemId) return;
        const fetch = async () => {
            setLoading(false);
            const data = await getSharedUsersApi(itemId);
            if (data) {
                // save owner and existing shared users to state
                setOwner(data.owner);
                setSharedWith(data.sharedWith);
            }
            setLoading(false);
        };

        fetch();
    }, [itemId]);


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
        const fetchSuggestedUsers = async () => {
            const users = await getSuggestedUsersApi()
            setSuggestedUsers(users)
        }
        fetchSuggestedUsers()
    }, [])

    // Helper to generate a random 8-character numeric password to bypass the strict backend validator!
    const generateRandomPassword = () => {
        // We strictly use ONLY numbers so that the backend's `min:8` math calculation succeeds!
        const chars = "123456789";
        let newPassword = "";
        for (let i = 0; i < 8; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPassword);
        setPasswordShow(true); // Automatically unhide the password so they can see what was generated!
    }

    // checks if the currently logged-in user is the owner of the item
    const isOwner =
        owner &&
        user &&
        String(owner.userId) === String(user._id);


    // Fixed: React-Select portal click ignore karo
    const handleOutsideClick = (e) => {
        // React-Select dropdown portal ko ignore karo
        const isReactSelect =
            e.target.closest('[class*="-menu"]') ||
            e.target.closest('[class*="-option"]') ||
            e.target.closest('[class*="-control"]') ||
            e.target.closest('[class*="-MenuList"]') ||
            e.target.closest('[class^="css-"]')

        if (isReactSelect) return;

        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true)
            setTimeout(() => setShake(false), 400)
        }
    }


    // adds a user from search results to the selected list
    const handleSelectUser = (user) => {
        setSelectedUsers(prev => {
            const next = new Map(prev)
            // default their permission to whatever is in the main dropdown
            next.set(user._id, { user, permission })
            return next
        })
        // clear search box after selecting
        setSearchTerm("")
        setSearchResults([])
    }


    // removes a user from the newly selected list (clicking the 'X' button)
    const handleRemoveSelected = (userId) => {
        setSelectedUsers(prev => {
            const next = new Map(prev)
            next.delete(userId)
            return next
        })
    }


    // final share action when the "Share" button is clicked
    const handleShare = async () => {
        if (selectedUsers.size === 0) return

        const viewerIds = []
        const editorIds = []

        // separate the selected users by their chosen permissions
        selectedUsers.forEach(({ user, permission }) => {
            if (permission === "viewer") viewerIds.push(user._id)
            else editorIds.push(user._id)
        })

        // handle both single and multi-select sharing
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]

        // trigger the backend share APIs for each role
        if (viewerIds.length > 0) await shareItemApi(itemIds, viewerIds, "viewer")
        if (editorIds.length > 0) await shareItemApi(itemIds, editorIds, "editor")

        // refresh the shared users list from the backend after sharing
        const updated = await getSharedUsersApi(itemId)
        if (updated) {
            setOwner(updated.owner)
            setSharedWith(updated.sharedWith)
        }

        // clear the selection and close the modal
        setSelectedUsers(new Map())
        onClose()
    }


    // remove a user completely from the shared access list
    const handleUnshare = async (userId) => {
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
        await unshareItemApi(itemIds, [userId])
        // instantly remove them from the UI
        setSharedWith(prev => prev.filter(s => s.userId !== userId))
    }




    //  this function is used when user copies  the link of shareing 
    const handleCopyLink = async () => {
        try {
            if (allSelectedItems.length === 0) return

            const generatedLinks = generateShareLinks(allSelectedItems)

            const payload = {
                links: generatedLinks,
                is_public: accessType === "public",
                user_ids: accessType === "restricted" ? (() => {
                    const ids = [
                        ...sharedWith.map(s => s.userId),
                        ...Array.from(selectedUsers.keys()),
                        user._id
                    ];
                    return ids.length > 0 ? ids : [user._id];
                })() : []

            };

            // Only attach expire_date if they actually ticked the box
            if (linkExpiry && expiryDay) {
                const date = new Date();
                date.setDate(date.getDate() + parseInt(expiryDay.value));
                // Format directly to YYYY-MM-DD for the strict validator
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                payload.expire_date = `${yyyy}-${mm}-${dd}`;
            }

            // Only attach password if they actually ticked the box AND generated one
            if (passwordProtect && password) {
                // Ensure password is at least 8 characters
                if (password.length >= 8) {
                    payload.password = password;
                } else {
                    showNotification("Password must be at least 8 characters!", "error", "bottom-center");
                    return;
                }
            }

            await axiosApi.post("/links/store", payload)
            const linksText = generatedLinks.map(l => l.link).join(", ")
            await navigator.clipboard.writeText(linksText)
            showNotification("Link Copied", "success", "bottom-center")
        } catch (error) {
            console.error("Error generating/copying link:", error)
        }
    }

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

    // link expiry preset options
    const expiryDayOption = [
        { value: "1", label: "1 Day" },
        { value: "7", label: "7 Day" },
        { value: "30", label: "30 Day" },

    ];

    if (loading) {
        return <div className="p-3">Loading...</div>;
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
                        {/* ONLY the owner can search for and add new people */}
                        {isOwner === true ? (
                            <>
                                <div className="search-box-sec">
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
                                                onFocus={() => setInputFocused(true)}
                                                onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                                                className='custom-form-control h-36'
                                            />
                                        </div>
                                    </Form.Group>
                                    <h3 class="modal-title-sub">Shared with people</h3>

                                    {/* show suggested users on focus with empty input */}
                                    {inputFocused && searchTerm.trim().length === 0 && filteredSuggestedUsers.length > 0 && (
                                        <div className="input-dd">
                                            <ul className="mb-0 py-2">
                                                {/* mapping filtered suggested users */}
                                                {filteredSuggestedUsers.slice(0, 5).map(user => (
                                                    <li key={user._id} onClick={() => handleSelectUser(user)}>
                                                        <div className="share-user-list-dd d-flex align-items-center cursor-pointer p-2">
                                                            <InteractiveIcon
                                                                defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                width={48}
                                                                height={48}
                                                            />
                                                            <div className="ms-2 ps-1">
                                                                <p className="user-name mb-0">{user.name}</p>
                                                                <p className="user-email mb-0 small text-muted">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {/* Show the dropdown list if we have search results */}
                                    {filteredSearchResults.length > 0 && searchTerm.trim().length >= 2 && (
                                        <div className="input-dd">
                                            <ul className="mb-0 py-2">
                                                {/* mapping filtered search results */}
                                                {filteredSearchResults.map(user => (
                                                    <li key={user._id} onClick={() => handleSelectUser(user)}>
                                                        <div className="share-user-list-dd d-flex align-items-center cursor-pointer p-2">
                                                            <InteractiveIcon
                                                                defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                width={48}
                                                                height={48}
                                                            />
                                                            <div className="ms-2 ps-1">
                                                                <p className="user-name mb-0">{user.name}</p>
                                                                <p className="user-email mb-0 small text-muted">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="position-relative">
                                    <div className="share-user-shade"></div>
                                    <div className="share-user-shade2"></div>

                                    {/* Show the list of NEW users waiting to be shared */}
                                    {selectedUsers.size > 0 && (
                                        <>
                                            {/* mapping selected pending users */}
                                            {[...selectedUsers.entries()].map(([userId, { user, permission }]) => (
                                                <ul className="share-user-container" key={userId}>
                                                    <li>
                                                        <div className="share-user-list d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center">
                                                                <div className="share-user-profilepic">
                                                                    <InteractiveIcon
                                                                        defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                        width={48}
                                                                        height={48}
                                                                    />
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
                                                                        styles={{
                                                                            control: (base) => ({ ...base, minWidth: '130px' }),
                                                                            menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%', right: 0 }),
                                                                            option: (base) => ({ ...base, whiteSpace: 'nowrap' })
                                                                        }}
                                                                        onChange={(val) => {
                                                                            setSelectedUsers(prev => {
                                                                                const next = new Map(prev);
                                                                                next.set(userId, { user, permission: val.value });
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        placeholder="Select permission"
                                                                    />
                                                                </Form.Group>
                                                                <button className="btn-only-icon ms-2" onClick={() => handleRemoveSelected(userId)}> <InteractiveIcon defaultIcon={closeIcon} width={22} alt="close" /></button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                </ul>
                                            ))}
                                        </>
                                    )}

                                    <ul className="share-user-container">
                                        {/* Always show the owner at the top of the list */}
                                        {owner && (
                                            <li>
                                                <div className="share-user-list d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center">
                                                        <div className="share-user-profilepic">
                                                            <InteractiveIcon
                                                                defaultIcon={owner.profilePic ? `${BASE_URL}${owner.profilePic}` : userProfileIcon}
                                                                width={48}
                                                                height={48}
                                                            />
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

                                        {/* mapping existing shared users */}
                                        {sharedWith.map(s => (
                                            <li key={s.userId}>
                                                <div className="share-user-list d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center">
                                                        <div className="share-user-profilepic">
                                                            <InteractiveIcon
                                                                defaultIcon={s.profilePic ? `${BASE_URL}${s.profilePic}` : userProfileIcon}
                                                                width={48}
                                                                height={48}
                                                            />
                                                        </div>
                                                        <div className="ms-2 ps-1">
                                                            <p className="user-name mb-0">{s.name}</p>
                                                            <p className="user-email mb-0 small text-muted">{s.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Form.Group
                                                            className="m-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ opacity: s.inherited ? 0.5 : 1, pointerEvents: s.inherited ? 'none' : 'auto' }}
                                                        >
                                                            <CustomSelect
                                                                isDisabled={s.inherited}
                                                                options={shareFileEditOptionsTwo}
                                                                isSearchable={false}
                                                                showIndicatorSeparator={false}
                                                                value={shareFileEditOptionsTwo.find(opt => opt.value === s.permission)}
                                                                styles={{
                                                                    control: (base) => ({ ...base, minWidth: '130px' }),
                                                                    menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%', right: 0 }),
                                                                    option: (base) => ({ ...base, whiteSpace: 'nowrap' })
                                                                }}
                                                                onChange={async (val) => {
                                                                    if (val.value === "remove") {
                                                                        handleUnshare(s.userId);
                                                                        return;
                                                                    }
                                                                    setSharedWith(prev =>
                                                                        prev.map(item =>
                                                                            item.userId === s.userId
                                                                                ? { ...item, permission: val.value }
                                                                                : item
                                                                        )
                                                                    );
                                                                    const itemIdsToUpdate = allSelectedIds.length > 1 ? allSelectedIds : [itemId];
                                                                    await shareItemApi(itemIdsToUpdate, [s.userId], val.value);
                                                                }}
                                                                placeholder="Select permission"
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* SIMPLE VIEW FOR NON-OWNER: They only see who the owner is, they cannot change permissions */}
                                {owner && (
                                    <ul className="share-user-container">
                                        <li>
                                            <div className="share-user-list d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    <div className="share-user-profilepic">
                                                        <InteractiveIcon
                                                            defaultIcon={owner.profilePic ? `${BASE_URL}${owner.profilePic}` : userProfileIcon}
                                                            width={48}
                                                            height={48}
                                                        />
                                                    </div>
                                                    <div className="ms-2 ps-1">
                                                        <p className="user-name mb-0">{owner.name}</p>
                                                        <p className="user-email mb-0 small text-muted">{owner.email}</p>
                                                    </div>
                                                </div>
                                                <p className="owner-tag mb-0">Owner</p>
                                            </div>
                                        </li>
                                    </ul>
                                )}
                            </>
                        )}


                        <div className="create-link-section">
                            <div className="create-link-section-header">
                                <h3 className="modal-title-sub">Create Link</h3>
                            </div>

                            {/* Access Type */}
                            <div className="create-link-items">
                                <div className="access-single-box">
                                    <div className="access-single-wrapper">
                                        <div className={`access-single-icon ${accessType === "public" ? "public-link" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={accessType === "public" ? publicLinkIcon : passwordIcon}
                                                width={24}
                                                alt=""
                                            />
                                        </div>
                                        <div className="access-single-contetn">
                                            <div className="access-single-dropdown-box">
                                                <span className="access-single-name">
                                                    {accessType === "restricted" ? "People with access" : "Public link"}
                                                </span>
                                                <Dropdown className="magic-dropdown dropdown-no-arrow">
                                                    <Dropdown.Toggle as="div" className="magic-dropdown__toggle">
                                                        <span className="magic-dropdown__chevron-wrapper">
                                                            <InteractiveIcon
                                                                defaultIcon={arrowDownIcon}
                                                                width={20}
                                                                alt=""
                                                                className="magic-dropdown__chevron-icon"
                                                            />
                                                        </span>
                                                    </Dropdown.Toggle>

                                                    <Dropdown.Menu align="start" className="magic-dropdown__menu">
                                                        {/* Hide 'restricted' option if already restricted */}
                                                        {accessType !== "restricted" && (
                                                            <Dropdown.Item
                                                                className="magic-dropdown__item"
                                                                onClick={() => setAccessType("restricted")}
                                                            >
                                                                People with access
                                                            </Dropdown.Item>
                                                        )}
                                                        {/* Hide 'public' option if already public */}
                                                        {accessType !== "public" && (
                                                            <Dropdown.Item
                                                                className="magic-dropdown__item"
                                                                onClick={() => setAccessType("public")}
                                                            >
                                                                Public link
                                                            </Dropdown.Item>
                                                        )}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>
                                            <span className="access-single-sun-name">
                                                {accessType === "restricted"
                                                    ? "People listed above have access."
                                                    : "Anyone with the link."}
                                            </span>
                                        </div>
                                    </div>
                                    {accessType === "public" && (
                                        <p className="modal-tag">View & Download</p>
                                    )}
                                </div>
                            </div>

                            {/* Link Expiration Section: ONLY shows if the access type is set to Public */}
                            {accessType === "public" && (
                                <div className={`create-link-items ${linkExpiry ? "" : "disable"}`}>
                                    <div className="create-link-items-content">
                                        <div className="form-check-group m-0">
                                            <label htmlFor="Link-expirtation" style={{ cursor: 'pointer' }}>
                                                <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                            </label>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                id="Link-expirtation"
                                                checked={linkExpiry}
                                                onChange={() => {
                                                    // If unticked, clear the expiry date to null
                                                    if (linkExpiry) {
                                                        setExpiryDay(null)
                                                    } else {
                                                        // If ticked, set the default to '1 Day'
                                                        setExpiryDay(expiryDayOption[0])
                                                    }
                                                    // toggle the checkbox boolean
                                                    setLinkExpiry(prev => !prev)
                                                }}
                                            />
                                            <span
                                                className='form-label m-0'
                                                onClick={() => {
                                                    if (linkExpiry) {
                                                        setExpiryDay(null)
                                                    } else {
                                                        setExpiryDay(expiryDayOption[0])
                                                    }
                                                    setLinkExpiry(prev => !prev)
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Link expirtation
                                            </span>
                                        </div>

                                        <div className="link-expirtation-day" onClick={(e) => e.stopPropagation()}>
                                            {/* If checkbox is NOT ticked, just show simple text */}
                                            {!linkExpiry ? (
                                                <p className="modal-tag">No expiration</p>
                                            ) : (
                                                <Form.Group className="mb-0">
                                                    <CustomSelect
                                                        options={expiryDayOption}
                                                        value={expiryDay}
                                                        onChange={(val) => setExpiryDay(val)}
                                                        placeholder="No expiration"
                                                        showIndicatorSeparator={false}
                                                        isSearchable={false}
                                                        className="expiry-select"
                                                    />
                                                </Form.Group>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Password Protect Section: ONLY shows if the access type is set to Public */}
                            {accessType === "public" && (
                                <div className={`create-link-items ${passwordProtect ? "" : "disable"}`}>
                                    <div className="create-link-items-content">
                                        <div className="form-check-group m-0">
                                            <label htmlFor="password-protect" style={{ cursor: 'pointer' }}>
                                                <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                            </label>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                id="password-protect"
                                                checked={passwordProtect}
                                                onChange={() => {
                                                    if (passwordProtect) setPassword("")
                                                    setPasswordProtect(prev => !prev)
                                                }}
                                            />
                                            <span
                                                className='form-label m-0'
                                                onClick={() => {
                                                    if (passwordProtect) setPassword("")
                                                    setPasswordProtect(prev => !prev)
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Password protect
                                            </span>
                                        </div>

                                        <div className="link-expirtation-day" onClick={(e) => e.stopPropagation()}>
                                            {/* If unticked, just show text */}
                                            {!passwordProtect ? (
                                                <p className="modal-tag d-none">No password</p>
                                            ) : (
                                                <>
                                                    <Form.Group className="mb-0" controlId="formPassword">
                                                        <div className='form-control-single-icon'>
                                                            <InteractiveIcon
                                                                defaultIcon={passwordShow ? viewIcon : viewHideIcon}
                                                                alt=""
                                                                className="form-right-icon"
                                                                width={24}
                                                                onClick={() => setPasswordShow(!passwordShow)}
                                                            />
                                                            <Form.Control
                                                                type={passwordShow ? "text" : "password"}
                                                                className='custom-form-control h-34'
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                    <button className="btn-black btn-lg m-0" type="button" onClick={generateRandomPassword}>
                                                        Generate
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="modal-add-new-btn" onClick={handleCopyLink}>
                            <InteractiveIcon defaultIcon={copyLinkIcon} width={24} alt="add" />
                            Copy link
                        </button>
                        <div className="modal-footer-btn-group">
                            <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
                            {/* Button is disabled if there are no specific users selected in the list (meaning nothing new to save) */}
                            <button
                                className="btn-black btn-lg m-0"
                                onClick={handleShare}
                                disabled={selectedUsers.size === 0}
                            >
                                Share
                            </button>
                        </div>
                    </Modal.Footer>

                </div>
            </Modal>
        </div>
    )
}

export default ShareUserModal


