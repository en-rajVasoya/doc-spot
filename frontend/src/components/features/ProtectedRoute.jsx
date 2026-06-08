import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"


function ProtectedRoute() {
  const { isLoading, user } = useAuth()
  if (isLoading) {
    return (
      <div className="loader-wrapper-box login">
        <div className="cma-messages-are-loader-wrapper">
          <span className="loader"></span>
        </div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/" replace />
  }
  return (
    <Outlet />
  )
}

export default ProtectedRoute