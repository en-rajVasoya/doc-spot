


import { useEffect, useState, useRef } from 'react'
import MainHeader from '../layout/header/MainHeader'
import TrashSubHeader from '../features/trash/TrashSubHeader '
import TrashContentView from '../features/trash/TrashContentView '
import ModalManager from "../modals/ModalManager"
import GlobalContextMenu from '../features/GlobalContextMenu'
import TransferPanel from '../features/upload/TransferPanel';
import SidebarNav from '../layout/header/SidebarNav';
import { useTrash } from '../../context/TrashContext'
import ModifiedContent from '../layout/header/ModifiedContent';

function TrashDashboard() {
    const { clearSelection, sortedItems, sortBy, setSortBy, sortOrder, setSortOrder, selectedIds, setSelectedIds } = useTrash()
    const [view, setView] = useState("grid")
    const [modal, setModal] = useState(null)
    const [searchBarOpen, setSearchBarOpen] = useState(false)
    const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false)

    // Drag and select refs
    const itemRefsFromContent = useRef({})
    const dragRootRef = useRef(null)
    const dragAndSelectRef = useRef(null)

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setModal(null)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <>
            <div className="page-wrapper" >
                <div className='content-wrapper-main'>

                    {/* Same main header */}
                    <div className="max-width-base-header">
                        <MainHeader
                            setModal={setModal}
                            searchBarOpen={searchBarOpen}
                            setSearchBarOpen={setSearchBarOpen}
                            isTrash={true}
                            onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
                        />
                        <TrashSubHeader view={view} setView={setView} setModal={setModal} />
                        <ModifiedContent 
                            displayItems={sortedItems} 
                            sortBy={sortBy} 
                            setSortBy={setSortBy} 
                            sortOrder={sortOrder} 
                            setSortOrder={setSortOrder} 
                            selectedIds={selectedIds} 
                            setSelectedIds={setSelectedIds} 
                        />
                    </div>


                    <div className='content-view-wrapper' ref={dragAndSelectRef}>
                        <div className="max-width-base" ref={dragRootRef}>
                            <GlobalContextMenu disableContextMenu={true} />

                            <TrashContentView 
                                view={view} 
                                setModal={setModal} 
                                onItemRefsReady={(refs) => { itemRefsFromContent.current = refs }}
                                dragRootRef={dragAndSelectRef}
                            />
                        </div>
                    </div>

                </div>

                <SidebarNav isSidebarNavOpen={isSidebarNavOpen} />

                {/* No NewAdd, No UploadPanel, No DownloadPanel, No DragAndDrop */}
                <ModalManager modal={modal} setModal={setModal} />

                <TransferPanel />
            </div>
        </>
    )
}

export default TrashDashboard





