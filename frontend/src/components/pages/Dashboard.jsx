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
  const { search: urlSearch, state: locationState } = useLocation();
  const { isSearchMode, searchResults, searchLoading, searchError, clearSearch, searchApi } = useSearch()
  const { clearSelection, items, sortBy, setSortBy, sortOrder, setSortOrder, selectedIds, setSelectedIds, loading, error, setOnItemsRemoved } = useFileExplorer()
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


  // ##################################################
  // ---- STEP 2: Propagate display state to components
  // ##################################################
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
  const [modals, setModals] = useState([]);

  const setModal = (modalData) => {
    if (modalData === null) {
      setModals(prev => prev.slice(0, -1));
    } else {
      setModals(prev => [...prev, modalData]);
    }
  }

  // Filter out and auto-close modals referencing item IDs that get unshared/removed in real-time
  useEffect(() => {
    if (!setOnItemsRemoved) return;
    setOnItemsRemoved((removedIds) => {
      const removedSet = new Set(removedIds.map(String));
      setModals(prev => prev.filter(m => {
        if (!m || !m.data) return true;

        const getItemId = (item) => (typeof item === 'object' && item !== null ? (item._id || item.id || item.itemId) : item);

        if (Array.isArray(m.data)) {
          return !m.data.some(item => {
            const id = getItemId(item);
            return id && removedSet.has(String(id));
          });
        }

        const singleId = getItemId(m.data);
        return singleId ? !removedSet.has(String(singleId)) : true;
      }));
    });
  }, [setOnItemsRemoved]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setModal(null)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    const query = params.get("search");
    const fileType = params.get("fileType");

    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const date = params.get("date");
    const owner = params.get("owner");
    const location = params.get("location");
    const personIds = params.get("personIds");

    if (!query && !fileType && !owner && !location && !dateFrom && !dateTo && !personIds) return;

    searchApi({
      query: query || null,
      fileType: fileType || null,
      ownerFilter: owner || null,
      location: location || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      date: date || null,
      personIds: personIds ? personIds.split(",") : null,
      personNames: locationState?.personNames || null,
      personProfilePics: locationState?.personProfilePics || null,
      personEmails: locationState?.personEmails || null,
      folderId: null,
    });
  }, [urlSearch, locationState]);



  return (
    <>
      <div className="page-wrapper all-page-search-bar" >
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
              <GlobalContextMenu setModal={setModal} modal={modals[modals.length - 1] || null} />


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
        <ModalManager modals={modals} setModal={setModal} />
        <UploadPanel setModal={setModal} />
        <DownloadPanel />
        <SidebarNav isSidebarNavOpen={isSidebarNavOpen} closeSidebar={() => setIsSidebarNavOpen(false)} />
        {/* <TransferPanel /> */}
      </div>
    </>
  )
}

export default Dashboard