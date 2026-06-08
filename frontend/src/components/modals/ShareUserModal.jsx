import { useState, useRef, useEffect } from "react";
import { Modal, Form, Dropdown  } from "react-bootstrap";
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


const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";


function ShareUserModal({ data, onClose }) {
    const [loading, setLoading] = useState(true);
    const { searchUsersApi, getSharedUsersApi, shareItemApi, unshareItemApi, selectedIds } = useFileExplorer()
    const { user } = useAuth()

    // SAFELY HANDLE BOTH: If data is an array (from header), use data[0]. If it's an object (from right-click), use data._id.
    const itemId = Array.isArray(data) ? data[0] : (data?._id || [...selectedIds][0]);
    const allSelectedIds = Array.isArray(data) ? data : (data ? [data._id] : [...selectedIds]);

    // if user click outside the modal shaking
    const [shake, setShake] = useState(false)
    const modalRef = useRef(null)


    //  searching
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState([])

    // selected user to share - map of userId => permission
    const [selectedUsers, setSelectedUsers] = useState([])
    // const [selectedUsers, setSelectedUsers] = useState(new Map())

    // getting already shared users to current item gettin gfrom backend
    const [owner, setOwner] = useState(null)
    const [sharedWith, setSharedWith] = useState([])

    //  permission for newer added user default viewr
    const [permission, setPermission] = useState("viewer")




    //  fetch shared users when modal opens
    useEffect(() => {
        if (!itemId) return;

        const fetch = async () => {
            setLoading(false);

            const data = await getSharedUsersApi(itemId);

            console.log("RAW API RESPONSE:", data)  // ADD THIS
            console.log("itemId used:", itemId)      // ADD THIS

            if (data) {
                setOwner(data.owner);
                setSharedWith(data.sharedWith);
            }

            setLoading(false);
        };

        fetch();
    }, [itemId]);


    // search users when user types
    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setSearchResults([])
            return
        }

        //  adding here 300ms time 
        const timeout = setTimeout(async () => {
            const results = await searchUsersApi(searchTerm)
            setSearchResults(results)
        }, 300)
        return () => clearTimeout(timeout)
    }, [searchTerm])


    //  if owner is there 
    // here checking user is owner or not her
    const isOwner =
        owner &&
        user &&
        String(owner.userId) === String(user._id);

    // shaking here if user click on outside modal
    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true)
            setTimeout(() => setShake(false), 400)
        }
    }


    // when user clicks on searhch result add that user to main modal
    const handleSelectUser = (user) => {
        setSelectedUsers(prev => {
            const next = new Map(prev)
            next.set(user._id, { user, permission })
            return next
        })
        setSearchTerm("")
        setSearchResults([])
    }


    // remove from selected users befor sharing
    const handleRemoveSelected = (userId) => {
        setSelectedUsers(prev => {
            const next = new Map(prev)
            next.delete(userId)
            return next
        })
    }



    //  share button click
    const handleShare = async () => {
        if (selectedUsers.size === 0) return

        const viewerIds = []
        const editorIds = []

        selectedUsers.forEach(({ user, permission }) => {
            if (permission === "viewer") viewerIds.push(user._id)
            else editorIds.push(user._id)
        })

        // Get all selected items
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]

        // Bulk Share: only 1 or 2 API calls total
        if (viewerIds.length > 0) await shareItemApi(itemIds, viewerIds, "viewer")
        if (editorIds.length > 0) await shareItemApi(itemIds, editorIds, "editor")

        const updated = await getSharedUsersApi(itemId)
        if (updated) {
            setOwner(updated.owner)
            setSharedWith(updated.sharedWith)
        }

        setSelectedUsers(new Map())
        onClose()
    }

    //  remove user form share        
    const handleUnshare = async (userId) => {
        const itemIds = allSelectedIds.length > 1 ? allSelectedIds : [itemId]
        await unshareItemApi(itemIds, [userId])
        setSharedWith(prev => prev.filter(s => s.userId !== userId))
    }


    const shareFileEditOptions = [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
    ];

    const shareFileEditOptionsTwo = [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
        { value: "remove", label: "Remove from shared" },
    ];

    console.log("owner is", owner)

    if (loading) {
        return <div className="p-3">Loading...</div>;
    }

    console.log("owner is ", owner)
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
                    </Modal.Header>

                    <Modal.Body>
                        {/*  Main div of modal */}
                        {isOwner === true ? (
                            <>
                                <div className="search-box-sec">
                                    {/*  user input */}
                                    <Form.Group className="mb-3">
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
                                                className='custom-form-control h-38'
                                            />
                                        </div>
                                    </Form.Group>

                                    {/* search result drop down here */}
                                    {searchResults.length > 0 && (
                                        <div className="input-dd">
                                            <ul className="mb-0 py-2">
                                                {searchResults.map(user => (
                                                    <li key={user._id} onClick={() => handleSelectUser(user)}>
                                                        <div className="share-user-list-dd d-flex align-items-center cursor-pointer p-2">
                                                            {/* user profle pic */}
                                                            <InteractiveIcon
                                                                defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                width={48}
                                                                height={48}
                                                            />
                                                            {/* user info */}
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


                                {/* showing already shared user list in main modal here */}
                                <div className="position-relative">
                                    <div className="share-user-shade"></div>
                                    <div className="share-user-shade2"></div>

                                    {/* if user select user here then display here */}
                                    {selectedUsers.size > 0 && (
                                        <>
                                            {[...selectedUsers.entries()].map(([userId, { user, permission }]) => (
                                                <ul className="share-user-container" key={userId}>
                                                    <li>
                                                        <div key={userId} className="share-user-list  d-flex justify-content-between align-items-center">
                                                            <div className="d-flex  align-items-center">
                                                                {/* user profile pic */}
                                                                <div className="share-user-profilepic">
                                                                    <InteractiveIcon
                                                                        defaultIcon={`${BASE_URL}${user.profilePic}`}
                                                                        width={48}
                                                                        height={48}
                                                                    />
                                                                </div>
                                                                {/* user info */}
                                                                <div className="ms-2 ps-1">
                                                                    <p className="user-name mb-0">{user.name}</p>
                                                                    <p className="user-email mb-0 small text-muted">{user.email}</p>
                                                                </div>
                                                            </div>

                                                            {/* here drop down of owenr can assing viewer or editor permission */}
                                                            <div className="d-flex align-items-center gap-2">
                                                                <Form.Group className="m-0" onClick={(e) => e.stopPropagation()}>
                                                                    <CustomSelect
                                                                        options={shareFileEditOptions}
                                                                        isSearchable={false}
                                                                        showIndicatorSeparator={false}
                                                                        value={shareFileEditOptions.find(opt => opt.value === permission)}
                                                                        styles={{
                                                                            control: (base) => ({ ...base, minWidth: '130px' }),
                                                                            menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%' }),
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

                                                                <button className="btn-only-icon ms-2" onClick={() => handleRemoveSelected(userId)}>✕</button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                </ul>
                                            ))}
                                        </>
                                    )}

                                    {/* list */}

                                    <ul className="share-user-container" >

                                        {/* first owner info here */}
                                        {owner && (
                                            <li>
                                                <div className="share-user-list d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center ">
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


                                        {/* after owner all shared users list */}
                                        {sharedWith.map(s => (
                                            <li key={s.userId}>
                                                <div className="share-user-list d-flex justify-content-between align-items-center">
                                                    {/* user info here */}
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

                                                    {/* showing permission and user can remove from shared dropdown here */}
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Form.Group className="m-0" onClick={(e) => e.stopPropagation()} >
                                                            <CustomSelect
                                                                options={shareFileEditOptionsTwo}
                                                                isSearchable={false}
                                                                showIndicatorSeparator={false}
                                                                value={shareFileEditOptionsTwo.find(opt => opt.value === s.permission)}
                                                                styles={{
                                                                    control: (base) => ({ ...base, minWidth: '130px' }),
                                                                    menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%' }),
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

                                                                    // Update backend with new permission
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
                                {/* SIMPLE VIEW FOR NON-OWNER */}
                                {owner && (
                                    <ul className="share-user-container">
                                        <li>
                                            <div className="share-user-list d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    <div className="share-user-profilepic">
                                                        <InteractiveIcon
                                                            defaultIcon={
                                                                owner.profilePic
                                                                    ? `${BASE_URL}${owner.profilePic}`
                                                                    : userProfileIcon
                                                            }
                                                            width={48}
                                                            height={48}
                                                        />
                                                    </div>
                                                    <div className="ms-2 ps-1">
                                                        <p className="user-name mb-0">{owner.name}</p>
                                                        <p className="user-email mb-0 small text-muted">
                                                            {owner.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="owner-tag mb-0">Owner</p>
                                            </div>
                                        </li>
                                    </ul>
                                )}
                            </>
                        )}


                        <div className="Create-Link-section">
                            <div className="access-single-box">
                                <div className="access-single-wrapper">
                                    <div className="access-single-icon">
                                        <InteractiveIcon
                                            defaultIcon={passwordIcon}
                                            width={24}
                                            alt=""                                        
                                        />
                                    </div>
                                    <div className="access-single-contetn">
                                        <span className="access-single-name"></span>
                                        <span className="access-single-sun -name"></span>
                                    </div>
                                </div>
                            </div>
                            {/* dropdown - select sort field */}
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

                                    <Dropdown.Item
                                       
                                        className="magic-dropdown__item "

                                    >
                                        <span className="me-1">kkjh</span>

                                        
                                       
                                    </Dropdown.Item>

                                </Dropdown.Menu>
                            </Dropdown>
                        </div>


                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
                        <button
                            className="btn-black btn-lg m-0"
                            onClick={handleShare}
                            disabled={selectedUsers.size === 0}
                        >
                            Share
                        </button>
                    </Modal.Footer>

                </div>
            </Modal>
        </div>
    )

}

export default ShareUserModal
