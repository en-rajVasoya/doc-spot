// import { Modal } from "react-bootstrap"
// import { useState, useRef } from "react"
// import { useUpload } from "../../context/UploadContext"
// import InteractiveIcon from "../layout/InteractiveIcon"
// import closeIcon from "@images/icon/close-icon.svg"
// import useResponsive from "../../hooks/useResponsive"


// function ConflictModal(onClose) {
//   const { conflictModalData, resolveConflict } = useUpload()
//   const [choice, setChoice] = useState("replace")
//   const { isMobile } = useResponsive()
//   const [shake, setShake] = useState(false)
//   const modalRef = useRef(null)

//   if (!conflictModalData) return null

//   const { conflicts } = conflictModalData

//   const handleContinue = () => {
//     resolveConflict(choice)
//     setChoice("replace")
//   }

//   const handleOutsideClick = (e) => {
//     if (modalRef.current && !modalRef.current.contains(e.target)) {
//       if (isMobile) {
//         resolveConflict(null)
//       } else {
//         setShake(true)
//         setTimeout(() => setShake(false), 400)
//       }
//     }
//   }


//   return (
//     <div onClick={handleOutsideClick}>
//       <Modal
//         show={true}
//         backdrop="static"
//         keyboard={false}
//         centered
//         dialogClassName={shake ? "shake" : ""}
//         className="upload-option-modal"
//       >
//         <div ref={modalRef} className="position-relative">
//           <Modal.Header className="border-0">
//         <Modal.Title>File Conflict</Modal.Title>
//         <button
//           className="btn-only-icon"
//           onClick={() => resolveConflict(null)}
//         >
//           <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
//         </button>
//       </Modal.Header>

//       <Modal.Body>
//         <p className="mb-2 upload-option-file-name">These items already exist in this location:</p>

//         {/* conflicting file names list */}
//         <ul className="mb-3 upload-option-file-name" style={{ maxHeight: "150px", overflowY: "auto", paddingLeft: "1rem" }}>
//           {conflicts.map((name, i) => (
//             <li key={i} style={{ fontSize: "0.9rem" }}>{name}</li>
//           ))}
//         </ul>


//         {/*  here radio option */}
//         <div className="d-flex flex-column gap-2">
//           {/* <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
//                         <input
//                             type="radio"
//                             name="conflictChoice"
//                             value="replace"
//                             checked={choice === "replace"}
//                             onChange={() => setChoice("replace")}
//                          />
//                          <div>
//                             <div className="fw-medium">Replace existing</div>
//                             <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Old files will be overwritten</div>
//                         </div>
//                     </label> */}


//           <div className="rounded-checkbox-wrapper">

//             <label
//               className={`custom-radio-card ${choice === "replace" ? "active" : ""
//                 }`}
//             >
//               <input
//                 type="radio"
//                 name="conflictChoice"
//                 value="replace"
//                 checked={choice === "replace"}
//                 onChange={() => setChoice("replace")}
//                 className="rounded-checkbox"
//               />

//               <div>
//                 <div className="title">Replace existing file</div>
//                 <div className="subtitle">
//                   Old files will be overwritten
//                 </div>
//               </div>
//             </label>

//             <label
//               className={`custom-radio-card ${choice === "keepboth" ? "active" : ""
//                 }`}
//             >
//               <input
//                 type="radio"
//                 name="conflictChoice"
//                 value="keepboth"
//                 checked={choice === "keepboth"}
//                 onChange={() => setChoice("keepboth")}
//                 className="rounded-checkbox"
//               />

//               <div>
//                 <div className="title">Keep both files</div>
//                 <div className="subtitle">
//                   New files will be renamed like abc (1).txt
//                 </div>
//               </div>
//             </label>

//           </div>

//           {/* second choice here */}
//           {/* <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
//                         <input
//                             type="radio"
//                             name="conflictChoice"
//                             value="keepboth"
//                             checked={choice === "keepboth"}
//                             onChange={() => setChoice("keepboth")}
//                         />
//                         <div>
//                             <div className="fw-medium">Keep both</div>
//                             <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>New files will be renamed like abc (1).txt</div>
//                         </div>
//                     </label> */}

//         </div>

//       </Modal.Body>


//       <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//         <button type="button" className="btn-secondary btn-lg m-0" onClick={() => resolveConflict(null)}>
//           Cancel
//         </button>
//         <button type="button" className="btn-black btn-lg m-0" onClick={handleContinue}>
//           Continue
//         </button>
//       </Modal.Footer>
//         </div>
//       </Modal>
//     </div>
//   )

// }


// export default ConflictModal






import { Modal } from "react-bootstrap"
import { useState, useRef } from "react"
import { useUpload } from "../../context/UploadContext"
import InteractiveIcon from "../layout/InteractiveIcon"
import closeIcon from "@images/icon/close-icon.svg"
import useResponsive from "../../hooks/useResponsive"


function ConflictModal(onClose) {
  const { conflictModalData, resolveConflict, cancelScanning, closeAllSessions, sessions } = useUpload()
  const [choice, setChoice] = useState("replace")
  const { isMobile } = useResponsive()
  const [shake, setShake] = useState(false)
  const modalRef = useRef(null)

  if (!conflictModalData) return null

  const { conflicts } = conflictModalData

  const handleCancel = () => {
    resolveConflict(null)
    if (!sessions || sessions.length <= 1) {
      closeAllSessions()
    } else {
      cancelScanning()
    }
  }

  const handleContinue = () => {
    resolveConflict(choice)
    setChoice("replace")
  }

  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (isMobile) {
        handleCancel()
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 400)
      }
    }
  }


  return (
    <div onClick={handleOutsideClick}>
      <Modal
        show={true}
        backdrop="static"
        keyboard={false}
        centered
        dialogClassName={shake ? "shake" : ""}
        className="upload-option-modal"
      >
        <div ref={modalRef} className="position-relative">
          <Modal.Header className="border-0">
        <Modal.Title>File Conflict</Modal.Title>
        <button
          className="btn-only-icon"
          onClick={handleCancel}
        >
          <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
        </button>
      </Modal.Header>

      <Modal.Body>
        {conflicts.length === 1 ? (
          <p className="mb-3 upload-option-file-name">
            These items already exist in this location:{" "}
            <strong style={{ color: "var(--dark-87)", fontWeight: 600 }}>
              {conflicts[0]}
            </strong>
          </p>
        ) : (
          <div>
            <p className="mb-2 upload-option-file-name">
              These items already exist in this location:
            </p>
            <ul
              className="mb-3 upload-option-file-name"
              style={{ maxHeight: "150px", overflowY: "auto", paddingLeft: "1rem" }}
            >
              {conflicts.map((name, i) => (
                <li key={i} style={{ fontSize: "0.9rem" }}>
                  <strong style={{ color: "var(--dark-87)", fontWeight: 600 }}>
                    {name}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        )}


        {/*  here radio option */}
        <div className="d-flex flex-column gap-2">
          {/* <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="conflictChoice"
                            value="replace"
                            checked={choice === "replace"}
                            onChange={() => setChoice("replace")}
                         />
                         <div>
                            <div className="fw-medium">Replace existing</div>
                            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Old files will be overwritten</div>
                        </div>
                    </label> */}


          <div className="rounded-checkbox-wrapper">

            <label
              className={`custom-radio-card ${choice === "replace" ? "active" : ""
                }`}
            >
              <input
                type="radio"
                name="conflictChoice"
                value="replace"
                checked={choice === "replace"}
                onChange={() => setChoice("replace")}
                className="rounded-checkbox"
              />

              <div>
                <div className="title">Replace existing file</div>
                <div className="subtitle">
                  Old files will be overwritten
                </div>
              </div>
            </label>

            <label
              className={`custom-radio-card ${choice === "keepboth" ? "active" : ""
                }`}
            >
              <input
                type="radio"
                name="conflictChoice"
                value="keepboth"
                checked={choice === "keepboth"}
                onChange={() => setChoice("keepboth")}
                className="rounded-checkbox"
              />

              <div>
                <div className="title">Keep both files</div>
                <div className="subtitle">
                  New files will be renamed like abc (1).txt
                </div>
              </div>
            </label>

          </div>

          {/* second choice here */}
          {/* <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="conflictChoice"
                            value="keepboth"
                            checked={choice === "keepboth"}
                            onChange={() => setChoice("keepboth")}
                        />
                        <div>
                            <div className="fw-medium">Keep both</div>
                            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>New files will be renamed like abc (1).txt</div>
                        </div>
                    </label> */}

        </div>

      </Modal.Body>


      <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
        <button type="button" className="btn-secondary btn-lg m-0" onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" className="btn-black btn-lg m-0" onClick={handleContinue}>
          Continue
        </button>
      </Modal.Footer>
        </div>
      </Modal>
    </div>
  )

}


export default ConflictModal




