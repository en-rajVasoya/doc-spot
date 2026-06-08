import { NavLink } from "react-router-dom";
import enterIcon from "@images/icon/enter-icon.svg";
import navFolderIcon from "@images/icon/nav-folder-icon.svg";
import userPlusIcon from "@images/icon/user-plus.svg";
import sharedWithIcon from "@images/icon/shared-with-me-icon.svg";
import deleteIcon from "@images/icon/trash.svg";

const navItems = [
    { icon: navFolderIcon, label: "My Docspot", to: "/dashboard" },
    { icon: userPlusIcon, label: "Shared", to: "/shared" },
    { icon: sharedWithIcon, label: "Shared with me", to: "/shared-with-me" },
    { icon: deleteIcon, label: "Trash", to: "/trash-dashboard" },
];

export default function SidebarNav({isSidebarNavOpen }) {
    return (
         <nav className={`sidebar2 ${isSidebarNavOpen ? "sidebar2-Mobile" : ""}`}>
            <div className="sidebar2-sub">
                {navItems.map(({ icon, label, to }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `sidebar2Item ${isActive ? "sidebar2ItemActive" : ""}`
                    }
                >
                    <img src={icon} width={24} alt="" />

                    <div className="sidebar2LabelWrapper">{label}</div>
                </NavLink>
            ))}
            </div>
        </nav>
    );
}