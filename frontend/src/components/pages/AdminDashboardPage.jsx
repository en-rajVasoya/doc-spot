import MainHeader from '../layout/header/MainHeader'
import AdminDashboard from '../layout/admin/AdminDashboard'
import { useState, useEffect } from 'react'
import ModalManager from '../modals/ModalManager'
import { useAdmin } from '../../context/AdminContext'
import SidebarNav from '../layout/header/SidebarNav'

function AdminDashboardPage() {
  const [modals, setModals] = useState([]); // Array of stacked modals
  const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false)
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const { setSelectedIds } = useAdmin();

  // Clear selected users when modals are closed
  useEffect(() => {
    if (modals.length === 0) {
      setSelectedIds(new Set());
    }
  }, [modals.length, setSelectedIds]);

  // The ultimate adapter function! Child components never even know the stack exists.
  const setModal = (modalData) => {
    if (modalData === null) {
      setModals(prev => prev.slice(0, -1)); // Pops the top modal off the stack
    } else {
      setModals(prev => [...prev, modalData]); // Pushes a new modal onto the stack
    }
  }

  return (
    <div className="page-wrapper admin-page-wrapper">
      <div className="content-wrapper-main">
        <div className="max-width-base-header">
          <MainHeader
            setModal={setModal}
            isAdmin={true}
            onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
            searchBarOpen={searchBarOpen} 
            setSearchBarOpen={setSearchBarOpen}
          />
        </div>
        <div className="content-view-wrapper">
          <div className="max-width-base">
            <AdminDashboard setModal={setModal} />
          </div>
        </div>
      </div>
      <SidebarNav isSidebarNavOpen={isSidebarNavOpen} closeSidebar={() => setIsSidebarNavOpen(false)} isAdmin={true} />
      <ModalManager modals={modals} setModal={setModal} />
    </div>
  )
}

export default AdminDashboardPage