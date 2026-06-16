import MainHeader from '../layout/header/MainHeader'
import AdminDashboard from '../layout/admin/AdminDashboard'
import { useState } from 'react'

function AdminDashboardPage() {
  const [modal, setModal] = useState(null)
  const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false)

  return (
    <div className="page-wrapper admin-page-wrapper">
      <div className="content-wrapper-main">
        <div className="max-width-base-header">
          <MainHeader
            setModal={setModal}
            isAdmin={true}
            onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
          />
        </div>
        <div className="content-view-wrapper">
          <div className="max-width-base">
            <AdminDashboard />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage