import React from 'react'
import { useAdmin } from '../../../context/AdminContext'

function AdminDashboard() {
  const { users } = useAdmin()
  return (
    <div>
      {users.map((user) => (
        <p key={user.user_id}>{user}</p>
      ))}
    </div>
  )
}

export default AdminDashboard