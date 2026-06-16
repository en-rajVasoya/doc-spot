import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useSearch } from "../../../context/SearchContext";
import InteractiveIcon from "../InteractiveIcon";
import searchIcon from "@images/icon/search.svg";
import closeIcon from "@images/icon/close-icon.svg";
import Tooltip from "../Tooltip";
import menuIcon from "@images/icon/menu.svg";
import gridIcon from "@images/icon/grid.svg";
import { useNavigate } from "react-router-dom";

function SearchResults({ setSearchBarOpen, showViewButtons, view, setView }) {
    const { isSearchMode, searchResults, clearSearch, searchFilters, searchApi } = useSearch();
    const { selectedIds } = useFileExplorer();
    const navigate = useNavigate();

    // / Handle removing individual filter tags
    const handleRemoveFilter = (key, personIndex = null) => {
        const nextFilters = { ...searchFilters };
        if (key === "query") {
            nextFilters.query = "";
        } else if (key === "fileType") {
            nextFilters.fileType = null;
        } else if (key === "ownerFilter") {
            nextFilters.ownerFilter = null;
            nextFilters.personIds = null;
            nextFilters.personNames = null;
        } else if (key === "specific-person" && personIndex !== null) {
            const nextNames = nextFilters.personNames.filter((_, idx) => idx !== personIndex);
            const nextIds = nextFilters.personIds.filter((_, idx) => idx !== personIndex);
            nextFilters.personNames = nextNames;
            nextFilters.personIds = nextIds;
            if (nextNames.length === 0) {
                nextFilters.ownerFilter = null;
                nextFilters.personIds = null;
                nextFilters.personNames = null;
            }
        } else if (key === "location") {
            nextFilters.location = null;
        } else if (key === "date") {
            nextFilters.dateFrom = null;
            nextFilters.dateTo = null;
        }


        //  this fucntion is used for where user clsoe some filter so getting all remaning filter here
        const hasRemainingFilters =
            (nextFilters.query && nextFilters.query.trim() !== "") ||
            nextFilters.fileType ||
            nextFilters.ownerFilter ||
            nextFilters.location ||
            nextFilters.dateFrom ||
            nextFilters.dateTo;
        if (!hasRemainingFilters) {
            clearSearch();
            if (setSearchBarOpen) setSearchBarOpen(false);
        } else {
            searchApi(nextFilters);
        }

        navigate(`/dashboard`);
    };
    if (!isSearchMode) return null;
    return (
        <>
            <div className="header d-flex align-items-center justify-content-between m-0">
                <h2 className="page-title-name">
                    <InteractiveIcon
                        defaultIcon={searchIcon}
                        width={24}
                        height={24}
                        className="me-2"
                    />
                    Search results
                </h2>

                {showViewButtons && (
                    <div className="header-view d-flex align-items-center">
                        <ul className="mb-0 d-flex view-btn">
                            <li>
                                <Tooltip text="List View">
                                    <button
                                        className={`btn btn-icon rounded-end-0 ${view === "list" ? "view-active" : ""}`}
                                        onClick={() => setView("list")}
                                    >
                                        <InteractiveIcon defaultIcon={menuIcon} width={20} />
                                    </button>
                                </Tooltip>
                            </li>
                            <li>
                                <Tooltip text="Grid View">
                                    <button
                                        className={`btn btn-icon rounded-start-0  ${view === "grid" ? "view-active" : ""}`}
                                        onClick={() => setView("grid")}
                                    >
                                        <InteractiveIcon defaultIcon={gridIcon} width={20} />
                                    </button>
                                </Tooltip>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
            <div className="search-suggestion-filter-chips">
                {searchFilters.query && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Keyword</span>
                        <button className="search-suggestion-chip">
                            {searchFilters.query}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("query"); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                )}
                {searchFilters.fileType && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Type</span>
                        <button className="search-suggestion-chip">
                            {searchFilters.fileType}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("fileType"); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                )}
                {searchFilters.ownerFilter && searchFilters.ownerFilter !== "specific-person" && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Owner</span>
                        <button className="search-suggestion-chip">
                            {searchFilters.ownerFilter.replace(/-/g, ' ')}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("ownerFilter"); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                )}
                {searchFilters.personNames && searchFilters.personNames.map((name, i) => (
                    <div className="search-suggestion-filter-content" key={i}>
                        <span className="search-suggestion-label">Owner</span>
                        <button className="search-suggestion-chip">
                            {name}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("specific-person", i); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                ))}
                {searchFilters.location && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Location</span>
                        <button className="search-suggestion-chip">
                            {searchFilters.location.replace(/-/g, ' ')}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("location"); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                )}
                {searchFilters.dateFrom && searchFilters.dateTo && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Date</span>
                        <button className="search-suggestion-chip">
                            {new Date(searchFilters.dateFrom).toLocaleDateString()} to {new Date(searchFilters.dateTo).toLocaleDateString()}
                            <span className="btn-only-icon" onClick={(e) => { e.stopPropagation(); handleRemoveFilter("date"); }} >
                                <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={16}
                                    height={16}
                                />
                            </span>
                        </button>
                    </div>
                )}
                {selectedIds.size === 1 && (
                    <div className="search-suggestion-filter-content">
                        <span className="search-suggestion-label">Selected Location</span>
                        <button className="search-suggestion-chip selected-location-chip">
                            {searchResults.find(item => item._id === Array.from(selectedIds)[0])?.locationPath || "Unknown"}
                        </button>
                    </div>
                )}
                {/* Clear all filters button */}
                <button className="search-suggestion-clear-all-chip " onClick={() => {
                    clearSearch();
                    navigate(`/dashboard`);
                    if (setSearchBarOpen) setSearchBarOpen(false);
                }}>
                    Clear all
                </button>
            </div>
        </>
    )
}

export default SearchResults