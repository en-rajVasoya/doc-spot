import { useState, useRef, useEffect } from 'react'
import { Modal } from 'react-bootstrap';
import InteractiveIcon from '../layout/InteractiveIcon';
import closeIcon from "@images/icon/close-icon.svg"
import CustomScroll from "../layout/CustomScroll.jsx";
import { useFileExplorer } from '../../context/FileExplorerContext.jsx';
import Tooltip from "../layout/Tooltip";
import useResponsive from '../../hooks/useResponsive.js';

import { useAuth } from '../../context/AuthContext.jsx';

function ItemInfoModal({ data, onClose }) {
  const [shake, setShake] = useState(false);

  //  if acidantly modal sned multiple data so pick only one item to show item info 
  const item = Array.isArray(data) ? data[0] : data;
  const isFolder = item.type === "folder";

  const { isMobile } = useResponsive()
  const modalRef = useRef(null);

  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (isMobile) {
        onClose();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    }
  };
  //  here we need to fetch owner and shared user list 
  const { getSharedUsersApi, trail, getFolderSizeApi } = useFileExplorer();
  const { user: loggedInUser } = useAuth()

  const [owner, setOwner] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  //  calculating the folder size here
  const [calculatedSize, setCalculatedSize] = useState(item.type === "folder" ? null : item.fileSize)

  const [folderContents, setFolderContents] = useState("");


  // fetch the all detail when the modal opens here
  useEffect(() => {
    if (!item._id) return

    //  if there are any shared user so fetch it here
    const fetchSharedUsers = async () => {
      const result = await getSharedUsersApi(item._id)
      if (result) {
        setOwner(result.owner)
        setSharedWith(result.sharedWith)
      }
      setLoadingUsers(false)
    }


    const fetchFolderSize = async () => {
      if (isFolder) {
        const response = await getFolderSizeApi(item._id)
        if (response !== null) {
          setCalculatedSize(response.size)
          setFolderContents(response.contentsString)
        }
      }
    }

    fetchSharedUsers()
    fetchFolderSize()
  }, [item?._id, isFolder])



  // Helper to format bytes to KB/MB
  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper to format dates beautifully (e.g., 04 Sep 2026, 05:30 PM)
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Helper to format raw MIME types into human-readable strings
  const getFriendlyFileType = (mimeType, fileName) => {
    if (!mimeType) {
      if (fileName && fileName.includes(".")) return fileName.split('.').pop().toUpperCase() + " File";
      return "File";
    }

    if (mimeType === "application/pdf") return "PDF Document";
    if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "application/vnd.ms-excel") return "Excel Spreadsheet";
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/msword") return "Word Document";
    if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || mimeType === "application/vnd.ms-powerpoint") return "PowerPoint Presentation";
    if (mimeType.startsWith("image/")) return mimeType.split("/")[1].toUpperCase() + " Image";
    if (mimeType.startsWith("video/")) return mimeType.split("/")[1].toUpperCase() + " Video";
    if (mimeType.startsWith("audio/")) return mimeType.split("/")[1].toUpperCase() + " Audio";
    if (mimeType.startsWith("text/")) return mimeType.split("/")[1].toUpperCase() + " File";

    // Fallback: use extension from filename
    if (fileName && fileName.includes(".")) {
      return fileName.split('.').pop().toUpperCase() + " File";
    }

    return "File";
  };


  if (!item) return null;



  // Determine if it is a folder or file to show the correct Name property

  const itemName = item.name;

  // helper function to get the parent root label - my doc spot shared with me or shared
  const getRootLabel = () => {
    const itemOwnerId = item.owner?._id || item.owner;
    const isOwnerMe = itemOwnerId ? (itemOwnerId.toString() === loggedInUser?._id?.toString()) : true

    // check if it is shared with me label
    const isSharedWithMe = !isOwnerMe && (
      item.isSharedWithMe ||
      (trail && trail.some(t => t.isSharedWithMe))
    );

    if (isSharedWithMe) {
      return "Shared with me";
    }

    // check if item is shared by me here
    const isSharedByMe = item.isShared ||
      (sharedWith && sharedWith.length > 0) ||
      (trail && trail.some(t => t.isShared && !t.isSharedWithMe))

    if (isSharedByMe) {
      return "Shared";
    }

    // default doc spot
    return "My Docspot"

  }

  const rootLabel = getRootLabel();
  const trailNames = trail && trail.length > 0 ? trail.map(t => t.name).join(" / ") : "";
  const itemLocation = item.locationPath ? item.locationPath : (trailNames ? `${rootLabel} / ${trailNames}` : rootLabel);

  // Remove the owner from the shared list to prevent redundancy
  const filteredSharedWith = sharedWith.filter(user =>
    String(user.userId?._id || user.userId) !== String(owner?.userId?._id || owner?.userId)
  );

  return (
    <div onClick={handleOutsideClick}>
      <Modal
        show={true}
        backdrop="static"
        keyboard={false}
        centered
        dialogClassName={`modal-dialog-md ${shake ? "shake" : ""}`}
        className="file-details-modal"
      >
        <div ref={modalRef} className="position-relative">
          <Modal.Header className="border-0">
            <Modal.Title>{isFolder ? "Folder" : "File"} details</Modal.Title>
            <Tooltip text="Close" offset={8}>
              <button
                className="btn-only-icon"
                onClick={onClose}
              >
                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
              </button>
            </Tooltip>
          </Modal.Header>
          <Modal.Body className="p-0">
            <CustomScroll className="file-details-modal-body" showBottomBlur={false} showTopBlur={true}>
              <div className='file-details-single-box'>
                {/* Name */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Name</p>
                  <p className='file-details-value'> {itemName} </p>
                </div>

                {/* Location */}
                {!item.isTrashed && (
                  <div className='file-details-box'>
                    <p className='file-details-label'>Location</p>
                    <p className='file-details-value'>{itemLocation}</p>
                  </div>
                )}

                {/* Folder Contents */}
                {isFolder && folderContents && (
                  <div className='file-details-box'>
                    <p className='file-details-label'>Contains</p>
                    <p className='file-details-value'>{folderContents}</p>
                  </div>
                )}

                {/* Size */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Size</p>
                  <p className='file-details-value'>
                    {isFolder && calculatedSize === null ? "Calculating..." : formatSize(calculatedSize)}
                  </p>
                </div>



                {/* Type */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Type</p>
                  {/* CHANGE: Use getFriendlyFileType to convert MIME strings into readable types */}
                  <p className='file-details-value text-capitalize'>{isFolder ? "Folder" : getFriendlyFileType(item.fileType, item.name)}</p>
                </div>



                {/* Owner */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Owner</p>
                  <p className='file-details-value'>
                    {loadingUsers ? "Loading..." : (owner ? `${owner.name} · ${owner.email}` : "Unknown")}
                  </p>
                </div>


                {/* Uploaded */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Uploaded</p>
                  <p className='file-details-value'>{formatDate(item.createdAt)}</p>
                </div>
                {/* Modified */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Modified</p>
                  <p className='file-details-value'>{formatDate(item.updatedAt)}</p>
                </div>


                {/* Shared */}
                <div className='file-details-box'>
                  <p className='file-details-label'>Shared</p>
                  <p className='file-details-value'>{(filteredSharedWith.length > 0 || item.isShared) ? "Yes" : "No"}</p>
                </div>


                {/* Shared with people */}
                {filteredSharedWith.length > 0 && (
                  <div className='file-details-box'>
                    <p className='file-details-label'>Shared with people</p>
                    <ul className='file-details-shared-list'>
                      {filteredSharedWith.map(user => (
                        <li className='file-details-shared-item' key={user.userId}>
                          <p className='file-details-value'>
                            {user.name} · {user.email} <span className="text-muted small">({user.permission})</span>
                          </p>
                        </li>
                      ))}

                    </ul>
                  </div>
                )}

              </div>
            </CustomScroll>
          </Modal.Body>
          <Modal.Footer className="border-0 justify-content-end">
            <button className="btn-secondary btn-lg " onClick={onClose}>
              Close
            </button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  )
}

export default ItemInfoModal