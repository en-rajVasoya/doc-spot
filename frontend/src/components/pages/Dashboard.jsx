import { useEffect, useState, useRef, useMemo } from 'react'
import { useLocation } from "react-router-dom";
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
  const { search: urlSearch } = useLocation();  
  const { isSearchMode, searchResults, searchLoading, searchError, clearSearch, searchApi  } = useSearch()
  const { clearSelection, items, sortBy, setSortBy, sortOrder, setSortOrder, selectedIds, setSelectedIds, loading, error } = useFileExplorer()
  const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);
  const headerRef = useRef(null);
const [headerHeight, setHeaderHeight] = useState(215);

useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    
    const observer = new ResizeObserver(() => {
        setHeaderHeight(el.offsetHeight);
    });
    
    observer.observe(el);
    return () => observer.disconnect();
}, []);


  // ##################################################
  // ---- STEP 1: Sorting and displaying items --------
  // ##################################################
  const sortedSearchResults = useMemo(() => {
    // If not in search mode, there are no search results to sort
    if (!isSearchMode) return []

    // Create a fresh copy of the search results array before sorting it
    return [...searchResults].sort((a, b) => {
      // Always put folders before files, regardless of other sorting rules
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1

      let valA, valB

      if (sortBy === "name") {
        // For name sorting, convert both to lowercase to ensure 'A' and 'a' are treated equally
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
      } else if (sortBy === "size") {
        // For size sorting, use the file size or default to 0 if not present
        valA = a.fileSize || 0
        valB = b.fileSize || 0
      } else {
        // For date sorting, grab the most recent timestamp (update vs creation)
        valA = new Date(a.updatedAt || a.createdAt).getTime()
        valB = new Date(b.updatedAt || b.createdAt).getTime()
      }

      // Compare the two values and apply the ascending or descending order logic
      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      // If the values are identical, leave them in their current order
      return 0
    })
  }, [isSearchMode, searchResults, sortBy, sortOrder])


  // ##################################################
  // ---- STEP 2: Propagate display state to components
  // ##################################################
  // const displayItems = isSearchMode ? sortedSearchResults : items
  const displayItems = isSearchMode ? sortedSearchResults : (loading ? [] : items)
  const displayLoading = isSearchMode ? searchLoading : loading
  const displayError = isSearchMode ? searchError : error

  // ##################################################
  // ---- STEP 3: Drag and select item state ----------
  // ##################################################
  const itemRefsFromContent = useRef({})
  const dragRootRef = useRef(null)
  const dragAndSelectRef = useRef(null)

  // ##################################################
  // ---- STEP 4: View change state -------------------
  // ##################################################
  const [view, setView] = useState("grid");


  // ##################################################
  // ---- STEP 5: Modal open and close handlers -------
  // ##################################################
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // If any modal is currently open and the user hits the Escape key
      if (e.key === "Escape") {
        // Close the modal by setting its state to null
        setModal(null)
      }
    }
    // Attach the keyboard listener to the entire document
    document.addEventListener("keydown", handleKeyDown)
    // Clean up the listener when the Dashboard unmounts
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    const query = params.get("search");
    const fileType = params.get("fileType");

    // Only trigger if URL actually has search params
    if (!query && !fileType) return;

    searchApi({
      query:       query || null,
      fileType:    fileType || null,
      ownerFilter: params.get("owner") || null,
      location:    params.get("location") || null,
      dateFrom:    params.get("dateFrom") || null,
      dateTo:      params.get("dateTo") || null,
      personIds:   params.get("personIds") ? params.get("personIds").split(",") : null,
      folderId:    null,
    });
  }, [urlSearch]); 



  return (
    <>
      <div className="page-wrapper" >
        <div className='content-wrapper-main' >

          {/* Main header top */}
          <div className="max-width-base-header" ref={headerRef}>
            <MainHeader setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen}
              onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
            />
            <SubHeader view={view} setView={setView} setModal={setModal} isSearchMode={isSearchMode} />

            {isSearchMode && (
              <SearchResults
                setSearchBarOpen={setSearchBarOpen}
                showViewButtons={true}
                view={view}
                setView={setView}
              />
            )}

            <ModifiedContent
              displayItems={displayItems}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />
          </div>

          {/* Main content view dashboard and subheader  */}
          <div className='content-view-wrapper' ref={dragAndSelectRef}>
            <div className="max-width-base" ref={dragRootRef} style={{ height: `calc(100dvh - ${headerHeight}px)` }}>
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
                displayError={displayError}
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