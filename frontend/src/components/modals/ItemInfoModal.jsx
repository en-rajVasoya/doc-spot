import { useState } from 'react'
import { Modal } from 'react-bootstrap';
import InteractiveIcon from '../layout/InteractiveIcon';
import closeIcon from "@images/icon/close-icon.svg"
import CustomScroll from "../layout/CustomScroll.jsx";
import { useFileExplorer } from '../../context/FileExplorerContext.jsx';
import { useEffect } from 'react';

function ItemInfoModal({ data, onClose }) {
  const [shake, setShake] = useState(false);

  //  if acidantly modal sned multiple data so pick only one item to show item info 
  const item = Array.isArray(data) ? data[0] : data;

  //  here we need to fetch owner and shared user list 
  const { getSharedUsersApi, trail  } = useFileExplorer();
  const [owner, setOwner] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);



  // fetch the all detail when the modal opens here
  useEffect(() => {
    if (!item._id) return
    const fetchSharedUsers = async () => {
      const result = await getSharedUsersApi(item._id)
      if (result) {
        setOwner(result.owner)
        setSharedWith(result.sharedWith)
      }
      setLoadingUsers(false)
    }
    fetchSharedUsers()
  }, [item?._id])



  // Helper to format bytes to KB/MB
  const formatSize = (bytes) => {
    if (!bytes) return "—";
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


  if (!item) return null;



  // Determine if it is a folder or file to show the correct Name property
  const isFolder = item.type === "folder";
  const itemName = item.name;
  const trailNames = trail && trail.length > 0 ? trail.map(t => t.name).join(" / ") : "";
  const itemLocation = trailNames ? `My Docspot / ${trailNames}` : "My Docspot";


  return (
    <Modal
      show={true}
      backdrop="static"
      keyboard={false}
      centered
      dialogClassName={`modal-dialog-md ${shake ? "shake" : ""}`}
      className="file-details-modal"
    >
      <Modal.Header className="border-0">
        <Modal.Title>{isFolder ? "Folder" : "File"} details</Modal.Title>
        <button
          className="btn-only-icon"
          onClick={onClose}
        >
          <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
        </button>
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
            <div className='file-details-box'>
              <p className='file-details-label'>Location</p>
              <p className='file-details-value'>{itemLocation}</p>
            </div>

            {/* Size */}
            {isFolder ? (
              <div className='file-details-box'>
                <p className='file-details-label'>Size</p>
                <p className='file-details-value'>-</p>
              </div>
            ) : (
              <div className='file-details-box'>
                <p className='file-details-label'>Size</p>
                <p className='file-details-value'>{formatSize(item.fileSize)}</p>
              </div>
            )}



            {/* Type */}
            <div className='file-details-box'>
              <p className='file-details-label'>Type</p>
              {/* CHANGE: Use item.fileType instead of item.type */}
              <p className='file-details-value text-capitalize'>{isFolder ? "Folder" : (item.fileType || "File")}</p>
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
              <p className='file-details-value'>{(sharedWith.length > 0 || item.isShared) ? "Yes" : "No"}</p>
            </div>


            {/* Shared with people */}
            {sharedWith.length > 0 && (
              <div className='file-details-box'>
                <p className='file-details-label'>Shared with people</p>
                <ul className='file-details-shared-list'>
                  {sharedWith.map(user => (
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
    </Modal>
  )
}

export default ItemInfoModal