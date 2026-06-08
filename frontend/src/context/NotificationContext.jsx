// import React, { createContext, useContext, useState, useCallback } from "react";
// import { Toast, ToastContainer } from "react-bootstrap";

// // 1. Create global state
// const NotificationContext = createContext(null);

// export function NotificationProvider({ children }) {
//     const [notifications, setNotifications] = useState([]);

//     // Function to add notification (Success ya Error handle karne ke liye)
//     // type: 'success' | 'error' | 'warning' | 'info'
//     const showNotification = useCallback((message, type = "success") => {
//         const id = Math.random().toString(36).substr(2, 9);
//         const variant = type === "error" ? "danger" : type; // Bootstrap calls error 'danger'

//         // Nayi notification ko list mein add karein
//         setNotifications((prev) => [...prev, { id, message, variant }]);

//         // 4 seconds baad auto-remove karne ke liye
//         setTimeout(() => {
//             removeNotification(id);
//         }, 4000);
//     }, []);

//     // Function to remove notification manually
//     const removeNotification = useCallback((id) => {
//         setNotifications((prev) => prev.filter((n) => n.id !== id));
//     }, []);

//     // 2. Return all functions/state to every file
//     const value = {
//         showNotification,
//         removeNotification
//     };

//     return (
//         <NotificationContext.Provider value={value}>
//             {children}

//             {/* Notification UI (Floating at top-right) */}
//             <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: 'fixed' }}>
//                 {notifications.map(({ id, message, variant }) => (
//                     <Toast 
//                         key={id} 
//                         bg={variant} 
//                         onClose={() => removeNotification(id)}
//                         autohide
//                     >
//                         <Toast.Header closeButton={true}>
//                             <strong className="me-auto text-capitalize">
//                                 {variant === 'danger' ? 'Error' : 'Notification'}
//                             </strong>
//                         </Toast.Header>
//                         <Toast.Body className="text-white">
//                             {message}
//                         </Toast.Body>
//                     </Toast>
//                 ))}
//             </ToastContainer>
//         </NotificationContext.Provider>
//     );
// }

// // 3. Create custom hook
// export function useNotification() {
//     const context = useContext(NotificationContext);
//     if (!context) {
//         throw new Error("useNotification must be inside NotificationProvider");
//     }
//     return context;
// }




// import React, { createContext, useContext, useState, useCallback, useRef } from "react";
// import InteractiveIcon from "../components/layout/InteractiveIcon";
// import gridFolder1Icon from "@images/svgs/grid/F1.svg";

// const NotificationContext = createContext(null);
// const DURATION = 4000;

// const CONFIG = {
//   success: { 
//     icon: <InteractiveIcon defaultIcon={gridFolder1Icon} alt="Success" />, 
//     label: "Changes saved", 
//     borderColor: "#3B6D11", 
//     barColor: "#3B6D11", 
//     iconBg: "#EAF3DE", 
//     iconColor: "#27500A" 
//   },
//   error: { 
//     icon: <span style={{ fontWeight: 'bold' }}>!</span>, 
//     label: "Link has expired", 
//     borderColor: "#A32D2D", 
//     barColor: "#A32D2D", 
//     iconBg: "#FCEBEB", 
//     iconColor: "#791F1F" 
//   },
//   warning: { 
//     icon: <span>▲</span>, 
//     label: "Broken link!", 
//     borderColor: "#BA7517", 
//     barColor: "#BA7517", 
//     iconBg: "#FAEEDA", 
//     iconColor: "#633806" 
//   },
//   info: { 
//     icon: <span>i</span>, 
//     label: "Links imported!", 
//     borderColor: "#185FA5", 
//     barColor: "#185FA5", 
//     iconBg: "#E6F1FB", 
//     iconColor: "#0C447C" 
//   },
//   alert: { 
//     icon: <span>⚑</span>, 
//     label: "Action required!", 
//     borderColor: "#EA3843", 
//     barColor: "#534AB#EA3843//     iconBg: "#EEEDFE", 
//     iconColor: "#3C3489" 
//   },
// };



// function ToastItem({ id, message, type, onClose }) {
//   const cfg = CONFIG[type] || CONFIG.info;

//   return (
//     <div className="notification-single-box">
//       <div className="notification-content">
//         <div className="notification-content">
//           {cfg.icon}
//         </div>
//         <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{message}{" "}</span>
//         <button onClick={() => onClose(id)} style={{
//           background: "none", border: "none", cursor: "pointer",
//           color: "#888", fontSize: 13, padding: "2px 5px", borderRadius: 4,
//         }}>✕</button>
//       </div>

//       <div style={{ height: 3, background: "#eee" }}>
//         <div style={{
//           height: 3, background: cfg.barColor,
//           width: "100%",
//           animation: `shrink ${DURATION}ms linear forwards`,
//         }} />
//       </div>
//     </div>
//   );
// }

// export function NotificationProvider({ children }) {
// //   const [notifications, setNotifications] = useState([]);
// const [notifications, setNotifications] = useState([
//   { id: "1", message: "Your changes have been saved successfully.", type: "success" },
//   { id: "2", message: "This link is no longer valid or has timed out.", type: "error" },
//   { id: "3", message: "One or more links in your document are broken.", type: "warning" },
//   { id: "4", message: "All links have been imported to your workspace.", type: "info" },
//   { id: "5", message: "Please review the pending items in your queue.", type: "alert" },
// ]);
//   const timersRef = useRef({});

//   const removeNotification = useCallback((id) => {
//     setNotifications(prev => prev.filter(n => n.id !== id));
//     clearTimeout(timersRef.current[id]);
//     delete timersRef.current[id];
//   }, []);

//   const showNotification = useCallback((message, type = "info") => {
//     const id = Math.random().toString(36).substr(2, 9);
//     setNotifications(prev => [...prev, { id, message, type }]);
//     timersRef.current[id] = setTimeout(() => removeNotification(id), DURATION);
//   }, [removeNotification]);

//   return (
//     <NotificationContext.Provider value={{ showNotification, removeNotification }}>
//       {children}

//       <style>{`
//         @keyframes slideIn {
//           from { transform: translateX(-14px); opacity: 0; }
//           to   { transform: translateX(0); opacity: 1; }
//         }
//         @keyframes shrink {
//           from { width: 100%; }
//           to   { width: 0%; }
//         }
//       `}</style>

//       <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 9999 }}>
//         {notifications.map(({ id, message, type }) => (
//           <ToastItem key={id} id={id} message={message} type={type} onClose={removeNotification} />
//         ))}
//       </div>
//     </NotificationContext.Provider>
//   );
// }

// export function useNotification() {
//   const context = useContext(NotificationContext);
//   if (!context) throw new Error("useNotification must be inside NotificationProvider");
//   return context;
// }


import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import InteractiveIcon from "../components/layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg";
import doneIcon from "@images/icon/done-icon.svg";
import errorIcon from "@images/icon/error-icon.svg";
import warningIcon from "@images/icon/warning-icon.svg";
import alertIcon from "@images/icon/alert-icon.svg";

const NotificationContext = createContext(null);
const DURATION = 4000;

const CONFIG = {
    success: {
        icon: <InteractiveIcon defaultIcon={doneIcon} alt="Success" className="me-2" />,
        label: "Changes saved",
        barColor: "#398415",
        iconColor: "#398415"
    },
    error: {
        icon: <InteractiveIcon defaultIcon={errorIcon} alt="error" className="me-2" />,
        label: "Link has expired",
        barColor: "#EA3843",
        iconColor: "#EA3843"
    },
    warning: {
        icon: <InteractiveIcon defaultIcon={warningIcon} alt="warning" className="me-2" />,
        label: "Broken link!",
        barColor: "#FFB800",
        iconColor: "#FFB800"
    },
    info: {
        icon: <InteractiveIcon defaultIcon={warningIcon} alt="warning" className="me-2" />,
        label: "Links imported!",
        barColor: "#185FA5",
        iconColor: "#0C447C"
    },
    alert: {
        icon: <InteractiveIcon defaultIcon={alertIcon} alt="warning" className="me-2" />,
        label: "Action required!",
        barColor: "#EA3843",
        iconColor: "#EA3843"
    },
};

const POSITION_STYLES = {
    "top-right":     { top: "20px",    right: "20px",  bottom: "auto", left: "auto",  alignItems: "flex-end" },
    "top-left":      { top: "20px",    left: "20px",   bottom: "auto", right: "auto", alignItems: "flex-start" },
    "top-center":    { top: "20px",    left: "50%",    bottom: "auto", right: "auto", transform: "translateX(-50%)", alignItems: "center" },
    "bottom-right":  { bottom: "20px", right: "20px",  top: "auto",    left: "auto",  alignItems: "flex-end" },
    "bottom-left":   { bottom: "20px", left: "20px",   top: "auto",    right: "auto", alignItems: "flex-start" },
    "bottom-center": { bottom: "20px", left: "50%",    top: "auto",    right: "auto", transform: "translateX(-50%)", alignItems: "center" },
}

function ToastItem({ id, message, type, onClose }) {
    const cfg = CONFIG[type] || CONFIG.info;

    return (
        <div className="notification-single-box">
            <div className="notification-body">
                <div className="notification-content">
                    <div className="d-none">
                        {cfg.icon}
                    </div>
                    <span style={{ color: cfg.iconColor }} className="fw-d-medium">{message}</span>
                </div>
                <button className="btn-only-icon" onClick={() => onClose(id)}>
                    <InteractiveIcon defaultIcon={closeIcon} alt="close" />
                </button>
            </div>
            <div className="notification-bar d-none">
                <div className="notification-bar-line" style={{
                    background: cfg.barColor,
                    animation: `shrink ${DURATION}ms linear forwards`,
                }} />
            </div>
        </div>
    );
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
//     const [notifications, setNotifications] = useState([
//   { id: "1", message: "Your changes have been saved successfully.", type: "success" },
//   { id: "2", message: "This link is no longer valid or has timed out.", type: "error" },
//   { id: "3", message: "One or more links in your document are broken.", type: "warning" },
//   { id: "4", message: "All links have been imported to your workspace.", type: "info" },
//   { id: "5", message: "Please review the pending items in your queue.", type: "alert" },
// ]);
    const timersRef = useRef({});

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
        }
    }, []);

    // showNotification("message", "success", "top-right")
    // position defaults to "top-right" if not provided
    const showNotification = useCallback((message, type = "info", position = "top-right") => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message, type, position }]);
        timersRef.current[id] = setTimeout(() => removeNotification(id), DURATION);
        return id;
    }, [removeNotification]);

    // group notifications by position
    const grouped = notifications.reduce((acc, n) => {
        const pos = n.position || "top-right"
        if (!acc[pos]) acc[pos] = []
        acc[pos].push(n)
        return acc
    }, {})

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification }}>
            {children}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(-20px); opacity: 0; }
                    to   { transform: translateX(0); opacity: 1; }
                }
                @keyframes shrink {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>

            {Object.entries(grouped).map(([position, toasts]) => (
                <div
                    key={position}
                    className="notification-main-box"
                    style={{
                        position: "fixed",
                        zIndex: 9999,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        ...POSITION_STYLES[position]
                    }}
                >
                    {toasts.map(notification => (
                        <ToastItem
                            key={notification.id}
                            id={notification.id}
                            message={notification.message}
                            type={notification.type}
                            onClose={removeNotification}
                        />
                    ))}
                </div>
            ))}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within a NotificationProvider");
    return context;
}