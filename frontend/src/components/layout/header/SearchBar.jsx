
import InteractiveIcon from "../InteractiveIcon";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import searchIcon from "@images/icon/search.svg";
import AdvanceSearchIcon from "@images/icon/advance-search-icon.svg";
import { Form } from "react-bootstrap";
import Tooltip from "../Tooltip";
import CustomSelect from "../CustomSelect";
import { RangePicker } from "../FlatpickrComponents";
import calendarIcon from "@images/icon/calendar-icon.svg";
import closeIcon from "@images/icon/close-icon.svg";
import getFileIcon from "../../../utils/getFileIcon.js";
import getFolderIcon from "../../../utils/getFolderIconColor.js";
import { useSearch } from "../../../context/SearchContext.jsx";
import { useFileExplorer } from "../../../context/FileExplorerContext.jsx";
import axiosApi from "../../../utils/api.js";
import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import enterIcon from "@images/icon/enter-icon.svg";
import videoFile from "@images/svgs/media/video-file.svg";
import imgFile from "@images/svgs/media/img-file.svg";
import pdfFile from "@images/svgs/media/pdf-file.svg";
import zipFile from "@images/svgs/media/zip-file.svg";
import musicFile from "@images/svgs/media/music-file.svg";
import navFolderIcon from "@images/icon/nav-folder-icon.svg";
import fileIcon from "@images/svgs/file.svg";


function SearchBar({ searchBarOpen, setSearchBarOpen }) {
    const { searchApi, clearSearch, searchLoading, searchResults, isSearchMode, searchFilters } = useSearch();
    const { searchUsersApi, openFolder } = useFileExplorer();


    const [filePreview, setFilePreview] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [owner, setOwner] = useState(null);
    const [date, setDate] = useState(null);
    const [selectedDate, setSelectedDate] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showRangePicker, setShowRangePicker] = useState(false);
    const [showSelectPerson, setShowSelectPerson] = useState(false);
    const [selectedPersons, setSelectedPersons] = useState([]);

    const [location, setLocation] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [userOptions, setUserOptions] = useState([]);

    const [suggestionResults, setSuggestionResults] = useState([]);
    const [suggestionLoading, setSuggestionLoading] = useState(false);

    const searchRef = useRef(null);
    const debounceRef = useRef(null);


    //  this is when user press escape key then all back to normal dashboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                handleReset()
                setSearchBarOpen(false)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    })

    // this is when search bar is not open then clear all input
    useEffect(() => {
        if (!searchBarOpen) {
            setFileType(null)
            setOwner(null)
            setDate(null)
            setSelectedDate([])
            setShowRangePicker(false)
            setShowSelectPerson(false)
            setSelectedPersons([])
            setUserOptions([])
            setLocation(null)
            setShowSuggestions(false)
            setIsOpen(false)
        }
    }, [searchBarOpen])

    //  this is when user click on outside 
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideSearch =
                searchRef.current && searchRef.current.contains(event.target);
            const isFlatpickr = event.target.closest(".flatpickr-calendar");
            const isSearchToggle = event.target.closest(".header-search");

            if (isFlatpickr || isSearchToggle) return;

            if (!isInsideSearch) {
                setIsOpen(false);
                setShowSuggestions(false);
                if(!isSearchMode){
                    setSearchBarOpen(false)
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isSearchMode]);

    // debounce quick search
    useEffect(() => {
        if (!searchText.trim()) {
            setShowSuggestions(false);
            setSuggestionResults([]);
            return;
        }

        setShowSuggestions(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                setSuggestionLoading(true);
                const { data } = await axiosApi.get("/search/filter", {
                    params: { query: searchText },
                });
                setSuggestionResults(data.results || []);
            } catch {
                setSuggestionResults([]);
            } finally {
                setSuggestionLoading(false);
            }
        }, 500);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchText, clearSearch]);


    //  when user will cick on remove the filter  in content view so remove also here that in search bar
    // Sync search bar inputs with active search filters (e.g. when chips are cleared)
    useEffect(() => {
        // 1. Sync Search Text
        setSearchText(searchFilters.query || "");
        // 2. Sync File Type
        if (!searchFilters.fileType) {
            setFileType(null);
        } else {
            const opt = fileTypeOptions.find(o => o.value === searchFilters.fileType);
            if (opt) setFileType(opt);
        }
        // 3. Sync Owner & Specific Persons
        if (!searchFilters.ownerFilter) {
            setOwner(null);
            setSelectedPersons([]);
            setShowSelectPerson(false);
        } else {
            const opt = ownerOptions.find(o => o.value === searchFilters.ownerFilter);
            if (opt) setOwner(opt);
            if (searchFilters.ownerFilter === "specific-person" && searchFilters.personIds) {
                const persons = (searchFilters.personIds || []).map((id, idx) => ({
                    value: id,
                    label: searchFilters.personNames?.[idx] || "",
                    profilePic: searchFilters.personProfilePics?.[idx] || null,
                    email: searchFilters.personEmails?.[idx] || ""
                }));
                setSelectedPersons(persons);
                setShowSelectPerson(true);
            }
        }
        // 4. Sync Location
        if (!searchFilters.location) {
            setLocation(null);
        } else {
            const opt = locationOptions.find(o => o.value === searchFilters.location);
            if (opt) setLocation(opt);
        }
        // 5. Sync Dates
        if (!searchFilters.dateFrom && !searchFilters.dateTo) {
            setDate(null);
            setSelectedDate([]);
        }
    }, [searchFilters]);



    //  here this is option for the calander will not close on the first date pick using memo 
    const rangePickerOptions = useMemo(() => ({
        maxDate: "today",
        defaultDate: new Date()
    }), []);

    // search users for specific person select
    const handleUserSearch = useCallback((inputValue) => {
        console.log("handleUserSearch called", inputValue)
        if (!inputValue || inputValue.trim().length < 2) return;

        searchUsersApi(inputValue).then((users) => {
            const options = users.map((u) => ({
                value: u._id,
                label: u.name,
                email: u.email,
                profilePic: u.profilePic
            }));
            setUserOptions(options);
        });
    }, [searchUsersApi]);

    const navigate = useNavigate();
    const locationPath = useLocation().pathname;

    const handleSearch = () => {
        
        //  when user have empty input boxed and press enter here so search won happens here 
        const hasText = searchText.trim().length > 0;
        const hasFileType = fileType && fileType.value !== "Any";
        const hasOwner = owner && owner.value !== "Any";
        const hasLocation = location && location.value !== "Any";
        const hasDate = date && date.value !== "Any";
        // If the box is empty AND they haven't picked any advanced filters, do nothing!
        if (!hasText && !hasFileType && !hasOwner && !hasLocation && !hasDate) {
            return;
        }
        // --------------------------------

        setSuggestionResults([]);
        setShowSuggestions(false);

        let dateFrom = null;
        let dateTo = null;

        if (date?.value === "Today") {
            const today = new Date()
            dateFrom = today.toLocaleDateString("en-CA")
            dateTo = today.toLocaleDateString("en-CA")
        } else if (date?.value === "Last10") {
            const d = new Date()
            d.setDate(d.getDate() - 10)
            dateFrom = d.toLocaleDateString("en-CA")
            dateTo = new Date().toLocaleDateString("en-CA")

        } else if (date?.value === "Last30") {
            const d = new Date()
            d.setDate(d.getDate() - 30)
            dateFrom = d.toLocaleDateString("en-CA")
            dateTo = new Date().toLocaleDateString("en-CA")
        } else if (date?.value === "CustomDate" && selectedDate?.length >= 1) {
            dateFrom = selectedDate[0].toLocaleDateString("en-CA")

            if (selectedDate[1]) {
                dateTo = selectedDate[1].toLocaleDateString("en-CA")
            } else {
                // single date selected — cover full day
                dateTo = selectedDate[0].toLocaleDateString("en-CA")
            }
        }

        const selectedFileType = (fileType?.value?.toLowerCase() === "any") ? null : (fileType?.value || null)


        searchApi({
            query: searchText || null,
            fileType: selectedFileType,
            ownerFilter: owner?.value || null,
            location: location?.value || null,
            folderId: null,
            personIds:
                selectedPersons.length > 0 ? selectedPersons.map((p) => p.value) : null,
            personNames:
                selectedPersons.length > 0 ? selectedPersons.map((p) => p.label) : null,
            personProfilePics:
                selectedPersons.length > 0 ? selectedPersons.map((p) => p.profilePic) : null,
            personEmails:
                selectedPersons.length > 0 ? selectedPersons.map((p) => p.email) : null,
            dateFrom,
            dateTo,
        });

        setIsOpen(false);
        setShowSuggestions(false);
        setSearchBarOpen(false);

        // Redirect to dashboard so results are actually visible!
        if (locationPath !== "/dashboard") {
            navigate("/dashboard");
        }
    };

    const handleReset = () => {
        setFileType(null);
        setOwner(null);
        setDate(null);
        setSelectedDate([]);
        setShowRangePicker(false);
        setShowSelectPerson(false);
        setSelectedPersons([]);
        setUserOptions([]);
        setLocation(null);
        setSearchText("");
        setShowSuggestions(false);
    };

    const handleCloseSearchBar = () => {
        setSearchBarOpen(false);
        setShowRangePicker(false);
        setSelectedDate([]);
        setShowSelectPerson(false);
        setShowSuggestions(false);
        setSearchText("");
        setFileType(null);
        setOwner(null);
        setDate(null);
        // setTags([]);
        setIsOpen(false);
    };

    const fileTypeOptions = [
        { value: "Any", label: "Any", icon: fileIcon },
        { value: "Photo", label: "Photo", icon: imgFile },
        { value: "PDF", label: "PDF", icon: pdfFile },
        { value: "Video", label: "Video", icon: videoFile },
        { value: "Zip", label: "Zip", icon: zipFile },
        { value: "File", label: "File", icon: fileIcon },
        { value: "Folder", label: "Folder", icon: navFolderIcon },
    ];

    const ownerOptions = [
        { value: "Anyone", label: "Anyone" },
        { value: "owner-by-me", label: "Owner by me" },
        { value: "not-owner-by-me", label: "Not owner by me" },
        { value: "specific-person", label: "Specific person" },
    ];

    const dateOptions = [
        { value: "AnyTime", label: "Any time" },
        { value: "Today", label: "Today" },
        { value: "Last10", label: "Last 10 days" },
        { value: "Last30", label: "Last 30 days" },
        { value: "CustomDate", label: "Custom" },
    ];

    const locationOptions = [
        { value: "my-docspot", label: "My Docspot" },
        { value: "Shared", label: "Shared" },
        { value: "Shared-with-me", label: "Shared with me" },
        { value: "trash", label: "Trash" },
    ];

    return (
        <>
            {filePreview && (
                <FilePreviewModal
                    file={filePreview}
                    onClose={() => setFilePreview(null)}
                />
            )}
            {searchBarOpen && (
                <div className="top-search-single-box toolbar" ref={searchRef}>
                    <div className={`search-container ${showSuggestions || isOpen ? "show" : ""}`}>
                        <div className="search-area-box">
                            <Form.Group controlId="formName">
                                <div className="form-control-single-icon">
                                    <InteractiveIcon
                                        defaultIcon={searchIcon}
                                        className="form-left-icon"
                                        width={24}
                                    />

                                    <Form.Control
                                        name="name"
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Search"
                                        className="custom-form-control h-44"
                                        value={searchText}
                                        onFocus={() => setIsOpen(false)}
                                        onClick={() => setIsOpen(false)}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                setShowSuggestions(false);
                                                handleSearch();
                                            }
                                        }}
                                    />

                                    <div className="search-action-btn">

                                        <Tooltip text="Clear" placement="bottom">
                                            <button
                                                type="button"
                                                className="btn-only-icon"
                                                onClick={() => {
                                                    setSearchText("");
                                                    setShowSuggestions(false);
                                                    setSuggestionResults([]);
                                                }}
                                            >
                                                <InteractiveIcon
                                                    defaultIcon={closeIcon}
                                                    width={24}
                                                    height={24}
                                                />
                                            </button>
                                        </Tooltip>


                                        <span className="divider-icon"></span>


                                        <Tooltip text="Show search options" placement="bottom">
                                            <button
                                                className="btn-only-icon"
                                                onClick={() => setIsOpen(!isOpen)}
                                            >
                                                <InteractiveIcon
                                                    defaultIcon={AdvanceSearchIcon}
                                                    width={24}
                                                />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Form.Group>
                        </div>

                        {/* QUICK SEARCH SUGGESTIONS */}
                        {showSuggestions && !isOpen && (
                            <div className="search-suggestion-box">
                                <div className="search-suggestions-list">
                                    {/* {suggestionLoading && (
                                        <div className="search-suggestion-item">Searching...</div>
                                    )} */}

                                    {!suggestionLoading && suggestionResults.length === 0 && (
                                        <div className="search-suggestion-item justify-content-center border-0">
                                            No results found
                                        </div>
                                    )}

                                    {!suggestionLoading &&
                                        suggestionResults.slice(0, 5).map((item) => (
                                            <div
                                                key={item._id}
                                                className="search-suggestion-item"
                                                onClick={() => {
                                                    if (item.type === "file") {
                                                        setFilePreview(item);
                                                        setShowSuggestions(false);
                                                    } else if (item.type === "folder") {
                                                        openFolder(item);
                                                        setShowSuggestions(false);
                                                        setSearchText("");
                                                    }
                                                }}
                                            >
                                                <div className="search-suggestion-file-icon">
                                                    <InteractiveIcon
                                                        defaultIcon={
                                                            item.type === "folder"
                                                                ? getFolderIcon(
                                                                    item.color,
                                                                    "list",
                                                                    item.isShared,
                                                                )
                                                                : getFileIcon(item.name)

                                                        }
                                                        width={32}
                                                        height={28}
                                                    />
                                                </div>
                                                <div className="search-suggestion-file-info">
                                                    <div className="search-suggestion-file-name">
                                                        {item.name}
                                                    </div>
                                                    <div className="search-suggestion-file-meta">
                                                        {item.locationPath}
                                                    </div>
                                                </div>
                                                <div className="search-suggestion-file-time">
                                                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {suggestionResults.length > 0 && (
                                    <div className="search-suggestion-footer">
                                        <button
                                            className="search-See-all-btn"
                                            onClick={() => {
                                                setShowSuggestions(false);
                                                handleSearch();
                                            }}
                                        >
                                            See all results
                                            <span>
                                                <InteractiveIcon
                                                    defaultIcon={enterIcon}
                                                    alt=""
                                                    width={20}
                                                    height={20}
                                                />
                                            </span>
                                        </button>

                                        <button className="search-See-all-btn search-advance-btn "
                                            onClick={() => setIsOpen(!isOpen)}>
                                            <span>
                                                <InteractiveIcon
                                                    defaultIcon={AdvanceSearchIcon}
                                                    width={24}
                                                    height={24}
                                                />
                                            </span>
                                            Advanced Search
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* ADVANCED SEARCH DROPDOWN */}
                        {isOpen && (
                            <div className="search-dropdown">
                                <div className="search-dropdown-body">

                                    <Form.Group className="mb-3">
                                        <Form.Label>Owner</Form.Label>
                                        <CustomSelect
                                            options={ownerOptions}
                                            value={owner}
                                            onChange={(val) => {
                                                setOwner(val);
                                                setShowSelectPerson(val?.value === "specific-person");
                                                if (val?.value !== "specific-person") {
                                                    setSelectedPersons([]);
                                                    setUserOptions([]);
                                                }
                                            }}
                                            placeholder="Select a person"
                                            showIndicatorSeparator={false}
                                            isSearchable={false}
                                        />
                                    </Form.Group>

                                    {showSelectPerson && (
                                        <Form.Group className="mb-3 add-user-gradient-box">
                                            <CustomSelect
                                                options={userOptions}
                                                value={selectedPersons}
                                                onChange={(val) => {
                                                    // Wrap the single object in an array so .map() works later!
                                                    setSelectedPersons(val ? [val] : []);
                                                }}
                                                isMulti={false}
                                                isProfile={true}
                                                isSearchable={true}
                                                showDropdownIndicator={false}
                                                placeholder="Search people..."
                                                onInputChange={handleUserSearch}
                                                showIndicatorSeparator={false}
                                                isClearable={true}
                                            />
                                        </Form.Group>
                                    )}

                                    <Form.Group className="mb-3">
                                        <Form.Label>Date Modified</Form.Label>
                                        <CustomSelect
                                            options={dateOptions}
                                            value={date}
                                            onChange={(val) => {
                                                setDate(val);
                                                setShowRangePicker(val?.value === "CustomDate");
                                                if (val?.value !== "CustomDate") {
                                                    setSelectedDate([]);
                                                }
                                            }}
                                            placeholder="Select date"
                                            showIndicatorSeparator={false}
                                            isSearchable={false}
                                        />
                                    </Form.Group>

                                    {showRangePicker && (
                                        <RangePicker
                                            label="Date Range"
                                            value={selectedDate}
                                            onChange={(d, dateStr, instance) => {
                                                if (d.length === 2) {
                                                    setSelectedDate(d);
                                                    instance.close();
                                                }
                                            }}
                                            classNameCss="h-34"
                                            leftIcon={calendarIcon}
                                            height={20}
                                            width={20}
                                            options={rangePickerOptions}
                                            showIndicatorSeparator={false}
                                            isSearchable={false}
                                        />
                                    )}


                                    <Form.Group className="mb-3">
                                        <Form.Label>Type</Form.Label>
                                        <CustomSelect
                                            options={fileTypeOptions}
                                            value={fileType}
                                            onChange={setFileType}
                                            placeholder="Select type"
                                            showIndicatorSeparator={false}
                                            isSearchable={false}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Location</Form.Label>
                                        <CustomSelect
                                            options={locationOptions}
                                            value={location}
                                            onChange={setLocation}
                                            placeholder="Select location"
                                            showIndicatorSeparator={false}
                                            isSearchable={false}
                                        />
                                    </Form.Group>
                                </div>

                                <div className="search-dropdown-footer">
                                    <button
                                        className="btn-secondary btn-lg"
                                        onClick={handleReset}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className="btn-black btn-lg"
                                        onClick={handleSearch}
                                        disabled={searchLoading}
                                    >
                                        {searchLoading ? "Searching..." : "Search"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* <Tooltip text="Close" placement="bottom" offset={8}>
                        <button className="btn-only-icon search-close-btn">
                            <InteractiveIcon
                                defaultIcon={closeIcon}
                                width={24}
                                height={24}
                                onClick={handleCloseSearchBar}
                            />
                        </button>
                    </Tooltip> */}
                </div>
            )}
        </>
    );
}

export default SearchBar;


