import React, { useRef, useEffect, useState } from "react";
import InteractiveIcon from "../InteractiveIcon";
import searchIcon from "@images/icon/search.svg";
import { Form } from "react-bootstrap";
import { useAdmin } from "../../../context/AdminContext";
import Tooltip from "../Tooltip";
import closeIcon from "@images/icon/close.svg";

function AdminSearchBar({ searchBarOpen, setSearchBarOpen }) {
    const { searchQuery, setSearchQuery } = useAdmin();
    const searchRef = useRef(null);
    const [localSearch, setLocalSearch] = useState(searchQuery || "");

    //  close on the esc key 
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSearchBarOpen(false)
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    })


    //  clsoe the search bar on the outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideSearch = searchRef.current && searchRef.current.contains(event.target);
            const isSearchToggle = event.target.closest(".header-search-btn") || event.target.closest(".header-search");

            if (isSearchToggle) return

            if (!isInsideSearch) {
                setSearchBarOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setSearchBarOpen])



    //  here when user is typing r enter key press so search happnes
    const handleSearch = () => {
        setSearchQuery(localSearch)
    }

    if (!searchBarOpen) return null;

    return (
        <div className="top-search-single-box toolbar" ref={searchRef}>
            <div className="search-container show">
                <div className="search-area-box">
                    <Form.Group controlId="formAdminSearch">
                        <div className="form-control-single-icon">
                            <InteractiveIcon
                                defaultIcon={searchIcon}
                                className="form-left-icon"
                                width={24}
                            />
                            <Form.Control
                                name="adminSearch"
                                type="text"
                                autoComplete="off"
                                placeholder="Search users by name or email..."
                                className="custom-form-control h-44"
                                value={localSearch}
                                onChange={(e) => {
                                    setLocalSearch(e.target.value)
                                    setSearchQuery(e.target.value)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch()
                                    }
                                }}
                            />

                            {/*  clear search icon */}

                            <div className="search-action-btn">
                                <Tooltip text="Clear" placement="bottom">
                                    <button
                                        type="button"
                                        className="btn-only-icon"
                                        onClick={() => {
                                            setLocalSearch("")
                                            setSearchQuery("")
                                        }}>
                                        <InteractiveIcon
                                            defaultIcon={closeIcon}
                                            width={24}
                                            height={24}
                                        />
                                    </button>
                                </Tooltip>
                            </div>

                        </div>
                    </Form.Group>
                </div>
            </div>
        </div>
    )
}

export default AdminSearchBar