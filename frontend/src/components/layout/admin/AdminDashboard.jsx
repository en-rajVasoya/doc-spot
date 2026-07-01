import { useAdmin } from '../../../context/AdminContext'
import { useState, useRef } from 'react'
import InteractiveIcon from '../InteractiveIcon'
import checkboxIcon from "@images/icon/checkbox-check.svg"
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg"
import userManagementIcon from "@images/icon/user-management-icon.svg";
import CustomSelect from '../CustomSelect';
import { Form } from "react-bootstrap";
import arrowLeftIcon from "@images/icon/arrow-left.svg";
import arrowRightIcon from "@images/icon/arrow-right.svg";
import UserAvatar from '../UserAvatar'

const limitOptions = [
  { value: 10, label: "10" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
]

function AdminDashboard({ setModal }) {
  const { users, isLoading, pagination, setPagination, selectedIds, setSelectedIds, sortBy, setSortBy, sortOrder, setSortOrder, roleFilter, setRoleFilter, activeFilter, setActiveFilter, allMatchingIds } = useAdmin()

  const pageInputRef = useRef(null)

  const handleColumnSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }

    //  here whn user is on the diffrnet page and do sorting there so it will redirect to the first page here
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleCheckBoxSelected = () => {
    const allMatchingSelected = allMatchingIds.length > 0 && selectedIds.size === allMatchingIds.length
    if (allMatchingSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allMatchingIds))
    }
  }

  const handleCheckboxOnly = (e, userId) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedIds(newSelected)
  }

  const handleGoToPage = () => {
    const val = parseInt(pageInputRef.current?.value)
    if (val >= 1 && val <= pagination?.totalPages) {
      setPagination(prev => ({ ...prev, page: val }))
      if (pageInputRef.current) pageInputRef.current.value = ""
    }
  }

  const handlePageInputKeyDown = (e) => {
    if (e.key === "Enter") handleGoToPage()
  }

  // Build page number list with ellipsis
  const getPageNumbers = () => {
    const current = pagination?.page || 1
    const total = pagination?.totalPages || 1
    const pages = Array.from({ length: total }, (_, i) => i + 1)
      .filter(p => p === 1 || p === total || (p >= current - 1 && p <= current + 1))

    const result = []
    pages.forEach((p, idx) => {
      if (idx > 0 && p - pages[idx - 1] > 1) result.push("...")
      result.push(p)
    })
    return result
  }

  const startEntry = ((pagination?.page - 1) * pagination?.limit) + 1
  const endEntry = Math.min(pagination?.page * pagination?.limit, pagination?.total)

  if (isLoading) return (
    <p>loading</p>
  )

  return (

    <div className="content-wrapper-main">

      {/* Header */}
      <div className="max-width-base-header">
        <div className="master-header">
          <div className="d-flex align-items-center justify-content-between">

            <h5 className="admin-title">
              <InteractiveIcon
                defaultIcon={userManagementIcon}
                width={24}
                alt=""
                className=""
              />
              User Management
            </h5>

            <div className="d-flex align-items-center gap-2">

              <Form.Group className="mb-0 admin-form-control">
                <CustomSelect
                  options={limitOptions}
                  value={limitOptions.find(o => o.value === pagination?.limit) || limitOptions[1]}
                  onChange={(selected) => setPagination(prev => ({ ...prev, limit: selected.value, page: 1 }))}
                  showIndicatorSeparator={false}
                  isSearchable={false}
                />
              </Form.Group>

              <button type='button' className='btn-black btn-lg m-0'
                onClick={() => setModal({ type: "addUserAdminModal" })}
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-view-wrapper">
        <div className="max-width-base">
          <div className="grid-single-box list-view" style={{ userSelect: "none" }}>
            <section className="content-wrapper">
              <div className="table row">

                {/* Table Header */}
                <div className="table-header">
                  <div className="table-cell">
                    <div className="first-cell-data p-0">
                      <div className="form-check-group">
                        <label htmlFor="allcheck">
                          <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                        </label>
                        <input
                          type="checkbox"
                          className="checkbox"
                          id="allcheck"
                          checked={allMatchingIds.length > 0 && selectedIds.size === allMatchingIds.length}
                          onChange={handleCheckBoxSelected}
                        />
                      </div>
                      <div
                        className={`sorting-label-text ${sortBy === "name" ? "sorting-active" : ""}`}
                        onClick={() => handleColumnSort("name")}
                      >
                        User Name & ID
                        <InteractiveIcon
                          defaultIcon={squareArrowDownLinearIcon}
                          width={20}
                          alt=""
                          className={`sorting-label-icon ${sortBy === "name" ? "visible" : "invisible"} ${sortBy === "name" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="table-cell" onClick={() => handleColumnSort("email")}>
                    <div className={`sorting-label-text ${sortBy === "email" ? "sorting-active" : ""}`}>
                      Email
                      <InteractiveIcon
                        defaultIcon={squareArrowDownLinearIcon}
                        width={20}
                        alt=""
                        className={`sorting-label-icon ${sortBy === "email" ? "visible" : "invisible"} ${sortBy === "email" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Role  */}
                  <div className="table-cell" style={{ width: "150px" }}>
                    <div className="sorting-label-text">Role</div>
                  </div>

                  {/*  user status */}
                  <div className="table-cell" onClick={() => handleColumnSort("is_active")} style={{ width: "150px" }}>
                    <div className={`sorting-label-text ${sortBy === "is_active" ? "sorting-active" : ""}`}>
                      Status
                      <InteractiveIcon
                        defaultIcon={squareArrowDownLinearIcon}
                        width={20}
                        alt=""
                        className={`sorting-label-icon ${sortBy === "is_active" ? "visible" : "invisible"} ${sortBy === "is_active" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="table-cell" onClick={() => handleColumnSort("createdAt")}>
                    <div className={`sorting-label-text ${sortBy === "createdAt" ? "sorting-active" : ""}`}>
                      Created Date/ Time
                      <InteractiveIcon
                        defaultIcon={squareArrowDownLinearIcon}
                        width={20}
                        alt=""
                        className={`sorting-label-icon ${sortBy === "createdAt" ? "visible" : "invisible"} ${sortBy === "createdAt" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Empty State */}
                {users.length === 0 && (
                  <div className="page-empty-state">No users found</div>
                )}

                {/* Rows */}
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                  >
                    <div className={`table-row-inner ${selectedIds.has(user._id) ? "selected" : ""}`}>

                      {/* Name + Avatar */}
                      <div className="table-cell">
                        <div className="first-cell-data p-0">
                          <div className="form-check-group">
                            <label htmlFor={`user-${user._id}`}>
                              <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                            </label>
                            <input
                              type="checkbox"
                              className="checkbox"
                              id={`user-${user._id}`}
                              checked={selectedIds.has(user._id)}
                              onChange={() => { }}
                              onClick={(e) => handleCheckboxOnly(e, user._id)}
                            />
                          </div>
                          <div className="folder-name-single-box">
                            <div className='profile-single-box'>
                              <UserAvatar user={user} />
                            </div>
                            <div className='folder-name'>
                              <p className="file-name mb-0">{user.name}</p>
                              <p className="user-id-name">{user.user_id}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="table-cell">
                        <span>{user.email}</span>
                      </div>

                      {/* Role */}
                      <div className="table-cell">
                        <span className="badge-pill badge-pill--white">
                          {user.role === "admin" ? "Admin" : "User"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="table-cell">
                        <span className="status-dot">
                          <span className={`status-dot__circle ${user.is_active !== false ? "status-dot__circle--active" : "status-dot__circle--inactive"}`} />
                          {user.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Created At */}
                      <div className="table-cell">
                        {user.createdAt ? (
                          <div className="d-flex flex-column">
                            <span className="created-date">
                              {new Date(user.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")}
                            </span>
                            <span className="created-time text-muted">
                              {new Date(user.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                            </span>
                          </div>
                        ) : (
                          <span className="created-date">—</span>
                        )}
                      </div>

                    </div>
                  </div>
                ))}

              </div>
            </section>
          </div>


        </div>

        {/* Pagination Footer */}
        <div className="pagination-footer">

          {/* Left: Showing entries */}
          <span className="pagination-entries-text">
            Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{pagination?.total}</strong> entries
          </span>

          {/* Center: Page buttons */}
          <div className="pagination-pages">
            <button
              className="pagination-arrow-btn btn-only-icon"
              disabled={pagination?.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <InteractiveIcon defaultIcon={arrowLeftIcon} alt="" width={24} />
            </button>

            {getPageNumbers().map((item, idx) =>
              item === "..." ? (
                <span key={`dots-${idx}`} className="pagination-dots">…</span>
              ) : (
                <button
                  key={item}
                  className={`pagination-page-btn ${pagination?.page === item ? "pagination-page-btn--active" : ""}`}
                  onClick={() => setPagination(prev => ({ ...prev, page: item }))}
                >
                  {item}
                </button>
              )
            )}

            <button
              className="pagination-arrow-btn btn-only-icon"
              disabled={pagination?.page >= pagination?.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <InteractiveIcon defaultIcon={arrowRightIcon} alt="" width={24} />
            </button>
          </div>

          {/* Right: Go to page */}
          <div className="pagination-goto">
            {/* <span className="pagination-entries-text">
              <strong>{pagination?.page}</strong> of <strong>{pagination?.totalPages}</strong>
            </span> */}
            <Form.Group className="mb-0" controlId="formName">

              <div className='form-control-single-icon'>
                <InteractiveIcon
                  defaultIcon={arrowRightIcon}
                  alt=""
                  className="form-right-icon"
                  width={20}
                  onClick={handleGoToPage}
                />
                <Form.Control
                  ref={pageInputRef}
                  type="number"
                  min={1}
                  max={pagination?.totalPages}
                  placeholder="#"
                  className="custom-form-control"
                  onKeyDown={handlePageInputKeyDown}
                />
              </div>
            </Form.Group>
          </div>

        </div>
      </div>

    </div>

  )
}

export default AdminDashboard