import { Modal } from "react-bootstrap"
import { useState } from "react"
import { useUpload } from "../../context/UploadContext"
import InteractiveIcon from "../layout/InteractiveIcon"
import closeIcon from "@images/icon/close-icon.svg"


function ConflictModal(onClose){
    const { conflictModalData, resolveConflict  } = useUpload()
    const [choice, setChoice] = useState("replace")

    if(!conflictModalData) return null

    const {conflicts } = conflictModalData

    const handleContinue = () => {
        resolveConflict(choice)
        setChoice("replace")
    }


    return (
        <Modal show={true} backdrop="static" keyboard={false} centered className="upload-option-modal">
            <Modal.Header className="border-0">
                <Modal.Title>File Conflict</Modal.Title>
                <button
                            className="btn-only-icon"
                            onClick={onClose}
                        >
                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                        </button>
            </Modal.Header>

            <Modal.Body>
                <p className="mb-2 upload-option-file-name">These items already exist in this location:</p>
                
                {/* conflicting file names list */}
                <ul className="mb-3 upload-option-file-name" style={{ maxHeight: "150px", overflowY: "auto", paddingLeft: "1rem" }}>
                    {conflicts.map((name, i) => (
                        <li key={i} style={{ fontSize: "0.9rem" }}>{name}</li>
                    ))}
                </ul>


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
    className={`custom-radio-card ${
      choice === "replace" ? "active" : ""
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
    className={`custom-radio-card ${
      choice === "keepboth" ? "active" : ""
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
                <button type="button" className="btn-secondary btn-lg m-0" onClick={() => resolveConflict(null)}>
                    Cancel
                </button>
                <button type="button" className="btn-black btn-lg m-0" onClick={handleContinue}>
                    Continue
                </button>
            </Modal.Footer>

        </Modal>
    )

}


export default ConflictModal