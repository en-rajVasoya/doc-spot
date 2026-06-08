import { useEffect, useState, useRef, useMemo } from 'react'
import MainHeader from '../layout/header/MainHeader'
import SubHeader from '../layout/header/SubHeader'
import ContentView from '../layout/mainScreen/ContentView';
import NewAdd from '../features/NewAdd';
import GlobalContextMenu from '../features/GlobalContextMenu';
import ModalManager from '../modals/ModalManager';
import { FileExplorerProvider, useFileExplorer } from '../../context/FileExplorerContext';
import UploadPanel from '../features/upload/UploadPanel';
import DownloadPanel from '../features/download/DownloadPanel';
import DragAndDrop from '../features/DragAndDrop';
import { useSearch } from '../../context/SearchContext';
import TransferPanel from '../features/upload/TransferPanel';
import ModifiedContent from '../layout/header/ModifiedContent';
import SidebarNav from '../layout/header/SidebarNav';

import SearchResults from '../layout/header/SearchResults';


function Dashboard() {
  const [searchBarOpen, setSearchBarOpen] = useState(false)
  const { isSearchMode, searchResults, searchLoading, searchError, clearSearch } = useSearch()
  const { clearSelection, items, sortBy, sortOrder,  loading, error } = useFileExplorer()
  const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);


  //  here for the sorting and display item 
  const sortedSearchResults = useMemo(() => {
    if (!isSearchMode) return []
    return [...searchResults].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1
        let valA, valB
        if (sortBy === "name") {
            valA = a.name.toLowerCase()
            valB = b.name.toLowerCase()
        } else if (sortBy === "size") {
            valA = a.fileSize || 0
            valB = b.fileSize || 0
        } else {
            valA = new Date(a.updatedAt || a.createdAt).getTime()
            valB = new Date(b.updatedAt || b.createdAt).getTime()
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1
        if (valA > valB) return sortOrder === "asc" ? 1 : -1
        return 0
    })
}, [isSearchMode, searchResults, sortBy, sortOrder])

const displayItems = isSearchMode ? sortedSearchResults : items
const displayLoading = isSearchMode ? searchLoading : loading
const displayError = isSearchMode ? searchError : error

  //  drag and select item state 
  const itemRefsFromContent = useRef({})
  const dragRootRef = useRef(null)
  const dragAndSelectRef = useRef(null)

  //  view change
  const [view, setView] = useState("grid");


  //  for any modal open
  const [modal, setModal] = useState(null);
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
        <div className='content-wrapper-main' >

          {/* Main header top */}
          <div className="max-width-base-header">
            <MainHeader setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen}
            onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
             />
            <SubHeader view={view} setView={setView} setModal={setModal} isSearchMode={isSearchMode} />

            {isSearchMode && <SearchResults setSearchBarOpen={setSearchBarOpen} />}
            
            <ModifiedContent displayItems={displayItems}  />
          </div>

          {/* Main content view dashboard and subheader  */}
          <div className='content-view-wrapper' ref={dragAndSelectRef}>
            <div className="max-width-base" ref={dragRootRef}>
              <DragAndDrop />
              <GlobalContextMenu setModal={setModal} modal={modal} />


              <ContentView
                view={view}
                setView={setView}
                setModal={setModal}
                searchBarOpen={searchBarOpen}
                setSearchBarOpen={setSearchBarOpen}
                onItemRefsReady={(refs) => { itemRefsFromContent.current = refs }}
                dragRootRef={dragAndSelectRef}
                displayItems={displayItems}
                displayLoading={displayLoading}
                displayError ={displayError}
              />
            </div>
          </div>

        </div>
        <NewAdd />
        {/*  all react bootstrap models */}
        <ModalManager modal={modal} setModal={setModal} />
        <UploadPanel setModal={setModal} />
        <DownloadPanel />
       <SidebarNav isSidebarNavOpen={isSidebarNavOpen} />
        {/* <TransferPanel /> */}
      </div>
    </>
  )
}

export default Dashboard