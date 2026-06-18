// // import Modal from "react-bootstrap/Modal";
// // import { useState, useRef } from "react";
// // import InteractiveIcon from "../layout/InteractiveIcon";
// // import Tooltip from "../layout/Tooltip";
// // import closeIcon from "@images/icon/close-icon.svg";

// // function CropImageModal({ data, onClose }) {
// //     // Extract the variables from the standard data object
// //     const { imgSrc, onSave } = data || {};
    
// //     // Map onCancel to the standard onClose function
// //     const onCancel = onClose;
// //     const CONTAINER = 200;
// //     const CIRCLE = 200;

// //     const containerRef = useRef(null);
// //     const lastPos = useRef({ x: 0, y: 0 });

// //     const [scale, setScale] = useState(() => 1);
// //     const [offset, setOffset] = useState({ x: 0, y: 0 });
// //     const [dragging, setDragging] = useState(false);

// //     const getImgStyle = () => ({
// //         transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
// //     });

// //     const onMouseDown = (e) => {
// //         setDragging(true);
// //         lastPos.current = { x: e.clientX, y: e.clientY };
// //     };
// //     const onMouseMove = (e) => {
// //         if (!dragging) return;
// //         const dx = e.clientX - lastPos.current.x;
// //         const dy = e.clientY - lastPos.current.y;
// //         lastPos.current = { x: e.clientX, y: e.clientY };
// //         setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
// //     };
// //     const stopDrag = () => setDragging(false);

// //     const onTouchStart = (e) => {
// //         setDragging(true);
// //         lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
// //     };
// //     const onTouchMove = (e) => {
// //         if (!dragging) return;
// //         const dx = e.touches[0].clientX - lastPos.current.x;
// //         const dy = e.touches[0].clientY - lastPos.current.y;
// //         lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
// //         setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
// //     };

// //     const handleSave = () => {
// //         if (!imgSrc) return;
// //         const EXPORT = 400;
// //         const img = new Image();
// //         img.onload = () => {
// //             const out = document.createElement("canvas");
// //             out.width = EXPORT;
// //             out.height = EXPORT;
// //             const ctx = out.getContext("2d");
// //             ctx.imageSmoothingEnabled = true;
// //             ctx.imageSmoothingQuality = "high";

// //             const cx = CONTAINER / 2;
// //             const cy = CONTAINER / 2;
// //             const iw = img.naturalWidth * scale;
// //             const ih = img.naturalHeight * scale;
// //             const ix = cx - iw / 2 + offset.x;
// //             const iy = cy - ih / 2 + offset.y;
// //             const cropLeft = cx - CIRCLE / 2;
// //             const cropTop = cy - CIRCLE / 2;
// //             const ratio = EXPORT / CIRCLE;

// //             ctx.drawImage(
// //                 img,
// //                 (ix - cropLeft) * ratio,
// //                 (iy - cropTop) * ratio,
// //                 iw * ratio,
// //                 ih * ratio
// //             );

// //             const url = out.toDataURL("image/png");

// //             out.toBlob((blob) => {
// //                 if (blob) {
// //                     const file = new File(
// //                         [blob],
// //                         `avatar-${Date.now()}.png`,
// //                         { type: "image/png" }
// //                     );
// //                     onSave(url, file);
// //                 }
// //             }, "image/png");
// //         };
// //         img.src = imgSrc;
// //     };

// //     return (
// //         <Modal
// //             show={true}
// //             backdrop="static"
// //             keyboard={false}
// //             centered
// //             dialogClassName="modal-dialog-sm"
// //             className="add-user-admin-modal crop-img-modal"
// //         >
// //             <Modal.Header className="border-0">
// //                 <Modal.Title>Crop Profile</Modal.Title>
// //                 <Tooltip text="Close" offset={8}>
// //                     <button className="btn-only-icon" onClick={onCancel}>
// //                         <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
// //                     </button>
// //                 </Tooltip>
// //             </Modal.Header>

// //             <Modal.Body className="p-0">
// //                 <div className="crop-preview-wrapper">
// //                     <div className="crop-outer-box">
// //                         {imgSrc && (
// //                             <img
// //                                 src={imgSrc}
// //                                 alt="bg"
// //                                 draggable={false}
// //                                 className="crop-bg-img"
// //                                 style={getImgStyle()}
// //                             />
// //                         )}
// //                         <div className="crop-overlay" />
// //                         <div className="crop-circle">
// //                             {imgSrc && (
// //                                 <img
// //                                     src={imgSrc}
// //                                     alt="crop"
// //                                     draggable={false}
// //                                     className="crop-main-img"
// //                                     style={getImgStyle()}
// //                                 />
// //                             )}
// //                         </div>
// //                         <div
// //                             ref={containerRef}
// //                             className={`crop-drag-handler ${dragging ? "dragging" : ""}`}
// //                             onMouseDown={onMouseDown}
// //                             onMouseMove={onMouseMove}
// //                             onMouseUp={stopDrag}
// //                             onMouseLeave={stopDrag}
// //                             onTouchStart={onTouchStart}
// //                             onTouchMove={onTouchMove}
// //                             onTouchEnd={stopDrag}
// //                         />
// //                     </div>
// //                 </div>

// //                 <div className="crop-slide-bar">
// //                     <input
// //                         type="range"
// //                         min="0"
// //                         max="500"
// //                         step="1"
// //                         value={Math.round(scale * 100)}
// //                         onChange={(e) => setScale(e.target.value / 100)}
// //                         className="crop-slider"
// //                     />
// //                 </div>

// //                 <div className="static-btn-box-modal justify-content-center">
// //                     <button className="btn-black btn-lg m-0" onClick={handleSave}>
// //                         Choose
// //                     </button>
// //                 </div>
// //             </Modal.Body>
// //         </Modal>
// //     );
// // }

// // export default CropImageModal;




// import Modal from "react-bootstrap/Modal";
// import { useState, useRef } from "react";
// import InteractiveIcon from "../layout/InteractiveIcon";
// import Tooltip from "../layout/Tooltip";
// import closeIcon from "@images/icon/close-icon.svg";

// function CropImageModal({ data, onClose }) {
//     const { imgSrc, onSave } = data || {};
//     const onCancel = onClose;

//     const CONTAINER = 200;
//     const CIRCLE = 200;

//     const containerRef = useRef(null);
//     const lastPos = useRef({ x: 0, y: 0 });

//     const [scale, setScale] = useState(1);
//     const [offset, setOffset] = useState({ x: 0, y: 0 });
//     const [dragging, setDragging] = useState(false);

//     const getImgStyle = () => ({
//         transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
//     });

//     const onMouseDown = (e) => {
//         setDragging(true);
//         lastPos.current = { x: e.clientX, y: e.clientY };
//     };
//     const onMouseMove = (e) => {
//         if (!dragging) return;
//         const dx = e.clientX - lastPos.current.x;
//         const dy = e.clientY - lastPos.current.y;
//         lastPos.current = { x: e.clientX, y: e.clientY };
//         setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
//     };
//     const stopDrag = () => setDragging(false);

//     const onTouchStart = (e) => {
//         setDragging(true);
//         lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
//     };
//     const onTouchMove = (e) => {
//         if (!dragging) return;
//         const dx = e.touches[0].clientX - lastPos.current.x;
//         const dy = e.touches[0].clientY - lastPos.current.y;
//         lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
//         setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
//     };

//     const handleSave = () => {
//         if (!imgSrc) return;
//         const EXPORT = 400;
//         const img = new Image();
//         img.onload = () => {
//             const out = document.createElement("canvas");
//             out.width = EXPORT;
//             out.height = EXPORT;
//             const ctx = out.getContext("2d");
//             ctx.imageSmoothingEnabled = true;
//             ctx.imageSmoothingQuality = "high";

//             const cx = CONTAINER / 2;
//             const cy = CONTAINER / 2;
//             const iw = img.naturalWidth * scale;
//             const ih = img.naturalHeight * scale;
//             const ix = cx - iw / 2 + offset.x;
//             const iy = cy - ih / 2 + offset.y;
//             const cropLeft = cx - CIRCLE / 2;
//             const cropTop = cy - CIRCLE / 2;
//             const ratio = EXPORT / CIRCLE;

//             ctx.drawImage(
//                 img,
//                 (ix - cropLeft) * ratio,
//                 (iy - cropTop) * ratio,
//                 iw * ratio,
//                 ih * ratio
//             );

//             const url = out.toDataURL("image/png");

//             out.toBlob((blob) => {
//                 if (blob) {
//                     const file = new File(
//                         [blob],
//                         `avatar-${Date.now()}.png`,
//                         { type: "image/png" }
//                     );
//                     onSave(url, file);
//                 }
//             }, "image/png");
//         };
//         img.src = imgSrc;
//     };

//     return (
//         <Modal
//             show={true}
//             backdrop="static"
//             keyboard={false}
//             centered
//             dialogClassName="modal-dialog-sm"
//             className="add-user-admin-modal crop-img-modal profile-crop-img"
//         >
//             <Modal.Header className="border-0">
//                 <Modal.Title>Crop Profile</Modal.Title>
//                 <Tooltip text="Close" offset={8}>
//                     <button className="btn-only-icon" onClick={onCancel}>
//                         <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
//                     </button>
//                 </Tooltip>
//             </Modal.Header>

//             <Modal.Body className="p-0">
//                 <div className="crop-preview-wrapper">
//                     <div className="crop-outer-box">
//                         {imgSrc && (
//                             <img
//                                 src={imgSrc}
//                                 alt="bg"
//                                 draggable={false}
//                                 className="crop-bg-img"
//                                 style={getImgStyle()}
//                             />
//                         )}
//                         <div className="crop-overlay" />
//                         <div className="crop-circle">
//                             {imgSrc && (
//                                 <img
//                                     src={imgSrc}
//                                     alt="crop"
//                                     draggable={false}
//                                     className="crop-main-img"
//                                     style={getImgStyle()}
//                                 />
//                             )}
//                         </div>
//                         <div
//                             ref={containerRef}
//                             className={`crop-drag-handler ${dragging ? "dragging" : ""}`}
//                             onMouseDown={onMouseDown}
//                             onMouseMove={onMouseMove}
//                             onMouseUp={stopDrag}
//                             onMouseLeave={stopDrag}
//                             onTouchStart={onTouchStart}
//                             onTouchMove={onTouchMove}
//                             onTouchEnd={stopDrag}
//                         />
//                     </div>
//                 </div>

//                 <div className="crop-slide-bar">
//                     <input
//                         type="range"
//                         min="0"
//                         max="500"
//                         step="1"
//                         value={Math.round(scale * 100)}
//                         onChange={(e) => setScale(e.target.value / 100)}
//                         className="crop-slider"
//                     />
//                 </div>

//                 <div className="static-btn-box-modal justify-content-center">
//                     <button className="btn-black btn-lg m-0" onClick={handleSave}>
//                         Choose
//                     </button>
//                 </div>
//             </Modal.Body>
//         </Modal>
//     );
// }

// export default CropImageModal;




import Modal from "react-bootstrap/Modal";
import { useState, useRef, useEffect } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg";

function CropImageModal({ data, onClose }) {
    const { imgSrc, onSave } = data || {};
    const onCancel = onClose;

    const CONTAINER = 200;
    const CIRCLE = 200;

    const containerRef = useRef(null);
    const lastPos = useRef({ x: 0, y: 0 });

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);

    // fitScale — image open hote hi sahi size mein fit karo
    useEffect(() => {
        if (!imgSrc) return;
        const img = new Image();
        img.onload = () => {
            const fitScale = Math.max(CIRCLE / img.naturalWidth, CIRCLE / img.naturalHeight);
            setScale(fitScale);
            setOffset({ x: 0, y: 0 });
        };
        img.src = imgSrc;
    }, [imgSrc]);

    const getImgStyle = () => ({
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
    });

    const onMouseDown = (e) => {
        setDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
    };
    const stopDrag = () => setDragging(false);

    const onTouchStart = (e) => {
        setDragging(true);
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
    };

    const handleSave = () => {
        if (!imgSrc) return;
        const EXPORT = 400;
        const img = new Image();
        img.onload = () => {
            const out = document.createElement("canvas");
            out.width = EXPORT;
            out.height = EXPORT;
            const ctx = out.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            const cx = CONTAINER / 2;
            const cy = CONTAINER / 2;
            const iw = img.naturalWidth * scale;
            const ih = img.naturalHeight * scale;
            const ix = cx - iw / 2 + offset.x;
            const iy = cy - ih / 2 + offset.y;
            const cropLeft = cx - CIRCLE / 2;
            const cropTop = cy - CIRCLE / 2;
            const ratio = EXPORT / CIRCLE;

            ctx.drawImage(
                img,
                (ix - cropLeft) * ratio,
                (iy - cropTop) * ratio,
                iw * ratio,
                ih * ratio
            );

            const url = out.toDataURL("image/png");

            out.toBlob((blob) => {
                if (blob) {
                    const file = new File(
                        [blob],
                        `avatar-${Date.now()}.png`,
                        { type: "image/png" }
                    );
                    onSave(url, file);
                }
            }, "image/png");
        };
        img.src = imgSrc;
    };

    return (
        <Modal
            show={true}
            backdrop="static"
            keyboard={false}
            centered
            dialogClassName="modal-dialog-sm"
            className=" crop-img-modal profile-crop-img"
        >
            <Modal.Header className="border-0">
                <Modal.Title>Crop Profile</Modal.Title>
                <Tooltip text="Close" offset={8}>
                    <button className="btn-only-icon" onClick={onCancel}>
                        <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                    </button>
                </Tooltip>
            </Modal.Header>

            <Modal.Body className="p-0">
                <div className="crop-preview-wrapper">
                    <div className="crop-outer-box">
                        {imgSrc && (
                            <img
                                src={imgSrc}
                                alt="bg"
                                draggable={false}
                                className="crop-bg-img"
                                style={getImgStyle()}
                            />
                        )}
                        <div className="crop-overlay" />
                        <div className="crop-circle">
                            {imgSrc && (
                                <img
                                    src={imgSrc}
                                    alt="crop"
                                    draggable={false}
                                    className="crop-main-img"
                                    style={getImgStyle()}
                                />
                            )}
                        </div>
                        <div
                            ref={containerRef}
                            className={`crop-drag-handler ${dragging ? "dragging" : ""}`}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={stopDrag}
                            onMouseLeave={stopDrag}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={stopDrag}
                        />
                    </div>
                </div>

                <div className="crop-slide-bar">
                    <input
                        type="range"
                        min="0"
                        max="500"
                        step="1"
                        value={Math.round(scale * 100)}
                        onChange={(e) => setScale(e.target.value / 100)}
                        className="crop-slider"
                    />
                </div>

                <div className="static-btn-box-modal justify-content-center">
                    <button className="btn-black btn-lg m-0" onClick={handleSave}>
                        Choose
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default CropImageModal;