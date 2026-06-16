import { useState, useEffect } from 'react';
import InteractiveIcon from '../InteractiveIcon';
import logoIcon from "@images/logo.svg";
import searchIcon from "@images/icon/search.svg";
import user1Image from "@images/user/u1.png";
import arrowDownIcon from "@images/icon/arrow-down.svg";
import editIcon from "@images/icon/edit.svg";
import userIcon from "@images/icon/user.svg";
import logOutIcon from "@images/icon/power.svg";
import BrandSmallIcon from "@images/small-logo.svg";
import menuIcon from "@images/icon/menu-icon.svg";
import HeaderToolbar from './HeaderToolbar';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import Tooltip from '../Tooltip.jsx';
import { useNavigate } from "react-router-dom";
import SearchBar from './SearchBar.jsx';
import TrashHeaderToolbar from '../../features/trash/TrashHeaderToolbar.jsx';
import { useFileExplorer } from '../../../context/FileExplorerContext.jsx';

//  getiing backend url for getting profile pic of user
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

function MainHeader({ setModal, setSearchBarOpen, searchBarOpen, isTrash, onMobileSidebarNavclick }) {


    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const { selectedIds } = useFileExplorer()


    // close search bar when an item is selected so toolbar can show
    useEffect(() => {
        if (selectedIds && selectedIds.size > 0) {
            setSearchBarOpen(false);
        }
    }, [selectedIds, setSearchBarOpen]);


    //  for logout user 
    const handleLogout = async () => {
        try {
            await logout();
            navigate("/")
        } catch (error) {
            console.log("Logout error", error.message)
        }
    }

    const profileImage = user?.profilePic
        ? `${BASE_URL}${user.profilePic}`
        : user1Image;


    return (
        <div className="master-header">
            <div className="d-flex align-items-center justify-content-between">
                {/* Logo */}

                <div className="logo-section">
                    <button className="sidebar2-Mobile-toggle-btn btn-only-icon" onClick={onMobileSidebarNavclick}>
                        <InteractiveIcon
                            defaultIcon={menuIcon}
                            alt=""
                            width={24}
                        />
                    </button>
                    <a className="logo" onClick={() => navigate("/dashboard")}>
                        <InteractiveIcon
                            defaultIcon={logoIcon}
                            alt=""
                        />
                    </a>
                </div>

                {/*  SEARCH BAR */}
                <SearchBar searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />

                {/* Toolbar */}
                {isTrash ? (
                    <TrashHeaderToolbar setModal={setModal} searchBarOpen={searchBarOpen} />
                ) : (
                    <HeaderToolbar setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />

                )}

                {/* Profile */}
                <div>
                    <ul className="d-flex align-items-center mb-0">
                        {/* {!searchBarOpen && (
                            <>
                                <li>
                                    <Tooltip text="Open Seachbar" placement="bottom">
                                        <InteractiveIcon
                                            defaultIcon={searchIcon}
                                            className="header-search"
                                            width={20}
                                            height={20}
                                            alt="Search"
                                            onClick={(e) => { setSearchBarOpen(prev => !prev); }}
                                        />
                                    </Tooltip>
                                </li>
                                <li>
                                    <div className="divider" />
                                </li>
                            </>
                        )} */}


                        <li>
                            <Dropdown className='profile-dropdown'>
                                <Dropdown.Toggle className='no-border-btn'>
                                    <div className="profile-dd">
                                        <span className="user-profile">
                                            <InteractiveIcon
                                                defaultIcon={profileImage}
                                                width={36}
                                                height={36}
                                                alt=""
                                            />
                                        </span>
                                        <div className="dd_arrow btn-only-icon">
                                            <img src={arrowDownIcon} alt="" width={18} />
                                        </div>
                                    </div>
                                </Dropdown.Toggle>

                                <Dropdown.Menu align="end" className='dropdown-menu-lg'>
                                    <div className='profile-header'>
                                        <InteractiveIcon
                                            defaultIcon={BrandSmallIcon}
                                            width={36}
                                            height={36}
                                            alt=""
                                        />
                                        <div className='profile-logo-box'>
                                            <h4 className='logo-text fwn-d-extrabold'>DOCSPOT <span className='version-status fwn-d-medium'>v1</span></h4>
                                        </div>
                                    </div>
                                    <div className="profile-img-box d-flex justify-content-center">
                                        <div className="position-relative">
                                            <span className="user-profile me-0">
                                                <InteractiveIcon
                                                    defaultIcon={profileImage}
                                                    width={100}
                                                    height={100}
                                                    alt=""
                                                />
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="profile-name text-center mb-3 text-capitalize">{user.name}</h4>
                                    {user.role === "admin" && (
                                        <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={() => navigate("/admin-dashboard")}>
                                            <InteractiveIcon
                                                defaultIcon={userIcon}
                                                width={24}
                                                height={24}
                                                alt="Profile"
                                            />
                                            <span className='item-name'>Manage Users</span>
                                        </Dropdown.Item>
                                    )}


                                    <Dropdown.Divider />

                                    <Dropdown.Item className="dropdown-item d-flex align-items-center" href="#">
                                        <InteractiveIcon
                                            defaultIcon={editIcon}
                                            width={24}
                                            height={24}
                                            alt="Profile"
                                        />
                                        <span className='item-name'>Edit Profile</span>
                                    </Dropdown.Item>
                                    <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={handleLogout} >
                                        <InteractiveIcon
                                            defaultIcon={logOutIcon}
                                            width={24}
                                            height={24}
                                            alt="Logout"
                                        />
                                        <span className='item-name'>Logout</span>
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </li>
                    </ul>
                </div>
            </div>


        </div>

    )
}

export default MainHeader