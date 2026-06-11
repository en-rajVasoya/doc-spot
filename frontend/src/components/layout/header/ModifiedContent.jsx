import { Dropdown } from "react-bootstrap";
import InteractiveIcon from "../InteractiveIcon";
import arrowDownIcon from "@images/icon/arrow-down.svg";
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg";
import checkboxIcon from "@images/icon/checkbox-check.svg";

const sortOptions = ["Name", "Modified", "Size"];

// map display name to backend value
const sortMap = {
    "Name": "name",
    "Modified": "modified",
    "Size": "size"
}

// map backend value to display name
const reverseSortMap = {
    "name": "Name",
    "modified": "Modified",
    "size": "Size"
}

export default function ModifiedContent({ 
    displayItems, 
    sortBy, 
    setSortBy, 
    sortOrder, 
    setSortOrder, 
    selectedIds, 
    setSelectedIds 
}) {


    // ##################################################
    // ---- when user selects sort field from dropdown
    // ##################################################
    function selectSort(val) {
        setSortBy(sortMap[val])
        setSortOrder("desc")  // reset to desc when changing sort field
    }


    // ##################################################
    // ---- when user clicks label toggle asc/desc
    // ##################################################
    function toggleSortOrder() {
        setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    }



    //  select the checkbox here
    const handleCheckBoxSelected = () => {
        if (selectedIds.size === displayItems.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(displayItems.map(item => item._id.toString())))
        }
    }


    return (
        <div className="sorting-file-wrapper">
            <div className="sorting-file-container">

                {/* ── Checkbox ── */}
                <div className="form-check-group">
                    <label htmlFor="myCheckbox">
                        <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                    </label>
                    <input
                        id="myCheckbox"
                        type="checkbox"
                        className="checkbox"
                        checked={displayItems.length > 0 && selectedIds.size === displayItems.length}
                        onChange={handleCheckBoxSelected} />
                </div>

                {/* sort label - click to toggle asc/desc */}
                <div className="sorting-btn">
                    <div className="sorting-label-text" onClick={toggleSortOrder}>

                        {/* show current sort field name */}
                        {reverseSortMap[sortBy]}

                        {/* arrow icon - flips when desc */}
                        <InteractiveIcon
                            defaultIcon={squareArrowDownLinearIcon}
                            width={20}
                            alt=""
                            className={`sorting-label-icon ${sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                        />
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
                            {sortOptions.map((opt) => (
                                <Dropdown.Item
                                    key={opt}
                                    className={`magic-dropdown__item ${reverseSortMap[sortBy] === opt ? "active" : ""}`}
                                    onClick={() => selectSort(opt)}
                                >
                                    <span className="me-1">{opt}</span>

                                    {/* show arrow icon on active sort field */}
                                    {reverseSortMap[sortBy] === opt && (
                                        <InteractiveIcon
                                            defaultIcon={squareArrowDownLinearIcon}
                                            width={20}
                                            alt=""
                                            className={`sorting-label-icon ${sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                                        />
                                    )}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        </div>
    )
}