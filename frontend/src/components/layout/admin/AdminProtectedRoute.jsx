import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

function AdminProtectedRoute() {

    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="loader-wrapper-box login">
                <div className="cma-messages-are-loader-wrapper">
                    <span className="loader"></span>
                </div>
            </div>
        )
    }


    //  if user not logged in so logged out user
    if(!user){
        return <Navigate to="/" replace />
    }

    if(user.role !== "admin"){
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

export default AdminProtectedRoute