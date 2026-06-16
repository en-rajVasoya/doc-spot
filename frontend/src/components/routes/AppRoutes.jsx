// import { Routes, Route } from "react-router-dom"
// import Login from "../userAuth/Login"
// import ProtectedRoute from "../features/ProtectedRoute"
// import Dashboard from "../pages/Dashboard"
// import TrashDashboard from "../pages/TrashDashboard"
// import { FileExplorerProvider } from "../../context/FileExplorerContext"
// import { TrashProvider } from "../../context/TrashContext"
// import AdminProtectedRoute from "../layout/admin/AdminProtectedRoute"
// import AdminDashboard from "../layout/admin/AdminDashboard"
// import { AdminAuthProvider } from "../../context/AdminContext"

// import { getRoute } from "../../utils/getRoutes.js"

// function AppRoutes() {
//   return (
//     <Routes>

//       {/* Login Route  */}
//       <Route path="/" element={<Login />} />

//       {/* now here protected routes */}
//       <Route element={<ProtectedRoute />}>

//         {/* My Docspot Dashboard */}
//         <Route path={getRoute.DASHBOARD} element={
//           <FileExplorerProvider filter={getRoute.DASHBOARD}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         <Route path={`${getRoute.DASHBOARD}/folder/:folderId`} element={
//           <FileExplorerProvider filter={getRoute.DASHBOARD}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         {/* Shared Dashboard */}
//         <Route path={getRoute.SHARED} element={
//           <FileExplorerProvider filter={getRoute.SHARED}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         <Route path={`${getRoute.SHARED}/folder/:folderId`} element={
//           <FileExplorerProvider filter={getRoute.SHARED}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         {/* Shared With Me Dashboard */}
//         <Route path={getRoute.SHARED_WITH_ME} element={
//           <FileExplorerProvider filter={getRoute.SHARED_WITH_ME}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         <Route path={`${getRoute.SHARED_WITH_ME}/folder/:folderId`} element={
//           <FileExplorerProvider filter={getRoute.SHARED_WITH_ME}>
//             <Dashboard />
//           </FileExplorerProvider>
//         } />

//         <Route path="/trash-dashboard" element={
//           <FileExplorerProvider key="trash">
//           <TrashProvider>
//             <TrashDashboard />
//           </TrashProvider>
//           </FileExplorerProvider>
//         } />

//         <Route path="/trash-dashboard/folder/:folderId" element={
//           <FileExplorerProvider key="trash-dashboard">
//           <TrashProvider>
//             <TrashDashboard />
//           </TrashProvider>
//           </FileExplorerProvider>
//         } />

//       </Route>




//       {/*  here admin protected route */}
//       <Route element={<AdminProtectedRoute />}>
//         <Route path="/admin-dashboard" element={
//           <AdminAuthProvider>
//             <AdminDashboard />
//           </AdminAuthProvider>
//         }></Route>
//       </Route>

//     </Routes>
//   )
// }

// export default AppRoutes

import { Routes, Route } from "react-router-dom"
import Login from "../userAuth/Login"
import ProtectedRoute from "../features/ProtectedRoute"
import Dashboard from "../pages/Dashboard"
import TrashDashboard from "../pages/TrashDashboard"
import { FileExplorerProvider } from "../../context/FileExplorerContext"
import { TrashProvider } from "../../context/TrashContext"
import AdminProtectedRoute from "../layout/admin/AdminProtectedRoute"
import AdminDashboard from "../layout/admin/AdminDashboard"
import { AdminAuthProvider } from "../../context/AdminContext"
import { getRoute } from "../../utils/getRoutes.js"
import SharedPreview from "../pages/SharedPreview.jsx"
import AdminDashboardPage from "../pages/AdminDashboardPage.jsx"

function AppRoutes() {
  return (
    <Routes>

      {/* Login Route  */}
      <Route path="/" element={<Login />} />

      {/* Public Shared Link Route — no auth needed */}
      <Route path="/share" element={<SharedPreview />} />

      {/* now here protected routes */}
      <Route element={<ProtectedRoute />}>

        {/* My Docspot Dashboard */}
        <Route path={getRoute.DASHBOARD} element={
          <FileExplorerProvider filter={getRoute.DASHBOARD}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        <Route path={`${getRoute.DASHBOARD}/folder/:folderId`} element={
          <FileExplorerProvider filter={getRoute.DASHBOARD}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        <Route path={`${getRoute.DASHBOARD}`} element={
          <FileExplorerProvider filter={getRoute.DASHBOARD}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        {/* Shared Dashboard */}
        <Route path={getRoute.SHARED} element={
          <FileExplorerProvider filter={getRoute.SHARED}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        <Route path={`${getRoute.SHARED}/folder/:folderId`} element={
          <FileExplorerProvider filter={getRoute.SHARED}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        {/* Shared With Me Dashboard */}
        <Route path={getRoute.SHARED_WITH_ME} element={
          <FileExplorerProvider filter={getRoute.SHARED_WITH_ME}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        <Route path={`${getRoute.SHARED_WITH_ME}/folder/:folderId`} element={
          <FileExplorerProvider filter={getRoute.SHARED_WITH_ME}>
            <Dashboard />
          </FileExplorerProvider>
        } />

        <Route path="/trash-dashboard" element={
          <FileExplorerProvider key="trash-dashboard">
            <TrashProvider>
              <TrashDashboard />
            </TrashProvider>
          </FileExplorerProvider>
        } />

        <Route path="/trash-dashboard/folder/:folderId" element={
          <FileExplorerProvider key="trash-dashboard">
            <TrashProvider>
              <TrashDashboard />
            </TrashProvider>
          </FileExplorerProvider>
        } />

      </Route>

      {/* here admin protected route */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin-dashboard" element={
          <AdminAuthProvider>
            <FileExplorerProvider>
              <AdminDashboardPage />
            </FileExplorerProvider>
          </AdminAuthProvider>
        } />
      </Route>

    </Routes>
  )
}

export default AppRoutes