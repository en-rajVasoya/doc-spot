import listFolder1Icon from "@images/svgs/list/SF1.svg";
import listFolder2Icon from "@images/svgs/list/SF2.svg";
import listFolder3Icon from "@images/svgs/list/SF3.svg";
import listFolder4Icon from "@images/svgs/list/SF4.svg";
import listFolder5Icon from "@images/svgs/list/SF5.svg";
import listFolder6Icon from "@images/svgs/list/SF6.svg";
import listFolder7Icon from "@images/svgs/list/SF7.svg";
import listFolder8Icon from "@images/svgs/list/SF8.svg";
import listFolder9Icon from "@images/svgs/list/SF9.svg";

import gridFolder1Icon from "@images/svgs/grid/F1.svg";
import gridFolder2Icon from "@images/svgs/grid/F2.svg";
import gridFolder3Icon from "@images/svgs/grid/F3.svg";
import gridFolder4Icon from "@images/svgs/grid/F4.svg";
import gridFolder5Icon from "@images/svgs/grid/F5.svg";
import gridFolder6Icon from "@images/svgs/grid/F6.svg";
import gridFolder7Icon from "@images/svgs/grid/F7.svg";
import gridFolder8Icon from "@images/svgs/grid/F8.svg";
import gridFolder9Icon from "@images/svgs/grid/F9.svg";


//  shared icon here for folder 
import listFolderUser1Icon from "@images/svgs/list/SF1s.svg";
import listFolderUser2Icon from "@images/svgs/list/SF2s.svg";
import listFolderUser3Icon from "@images/svgs/list/SF3s.svg";
import listFolderUser4Icon from "@images/svgs/list/SF4s.svg";
import listFolderUser5Icon from "@images/svgs/list/SF5s.svg";
import listFolderUser6Icon from "@images/svgs/list/SF6s.svg";
import listFolderUser7Icon from "@images/svgs/list/SF7s.svg";
import listFolderUser8Icon from "@images/svgs/list/SF8s.svg";
import listFolderUser9Icon from "@images/svgs/list/SF9s.svg";

import gridFolderUser1Icon from "@images/svgs/grid/F1s.svg";
import gridFolderUser2Icon from "@images/svgs/grid/F2s.svg";
import gridFolderUser3Icon from "@images/svgs/grid/F3s.svg";
import gridFolderUser4Icon from "@images/svgs/grid/F4s.svg";
import gridFolderUser5Icon from "@images/svgs/grid/F5s.svg";
import gridFolderUser6Icon from "@images/svgs/grid/F6s.svg";
import gridFolderUser7Icon from "@images/svgs/grid/F7s.svg";
import gridFolderUser8Icon from "@images/svgs/grid/F8s.svg";
import gridFolderUser9Icon from "@images/svgs/grid/F9s.svg";

const sharedMap = {
    red:        { list: listFolderUser1Icon, grid: gridFolderUser1Icon },
    orange:     { list: listFolderUser2Icon, grid: gridFolderUser2Icon },
    yellow:     { list: listFolderUser3Icon, grid: gridFolderUser3Icon },
    green:      { list: listFolderUser4Icon, grid: gridFolderUser4Icon },
    "green-dark": { list: listFolderUser5Icon, grid: gridFolderUser5Icon },
    blue:       { list: listFolderUser6Icon, grid: gridFolderUser6Icon },
    violet:     { list: listFolderUser7Icon, grid: gridFolderUser7Icon },
    pink:       { list: listFolderUser8Icon, grid: gridFolderUser8Icon },
    gray:       { list: listFolderUser9Icon, grid: gridFolderUser9Icon },
}



const normalMap = {
    red:        { list: listFolder1Icon,  grid: gridFolder1Icon },
    orange:     { list: listFolder2Icon,  grid: gridFolder2Icon },
    yellow:     { list: listFolder3Icon,  grid: gridFolder3Icon },
    green:      { list: listFolder4Icon,  grid: gridFolder4Icon },
    "green-dark": { list: listFolder5Icon, grid: gridFolder5Icon },
    blue:       { list: listFolder6Icon,  grid: gridFolder6Icon },
    violet:     { list: listFolder7Icon,  grid: gridFolder7Icon },
    pink:       { list: listFolder8Icon,  grid: gridFolder8Icon },
    gray:       { list: listFolder9Icon,  grid: gridFolder9Icon },
}

const getFolderIcon = (color, view, isShared = false) => {
    const map = isShared ? sharedMap : normalMap
    const normalizedColor = color?.toLowerCase() || "red"
    return map[normalizedColor]?.[view] || (view === "list" ? listFolder1Icon : gridFolder1Icon)
}

export default getFolderIcon