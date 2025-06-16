import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { useAuth } from '../store/auth'

export default function Layout({ children }: PropsWithChildren) {
  const setToken = useAuth((s) => s.setToken)
  const handleLogout = () => setToken(null)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-gray-800 text-white px-4 py-3 flex gap-4 items-center">
        <Link className="hover:text-blue-400" to="/study">Study</Link>
        <Link className="hover:text-blue-400" to="/search">Search</Link>
        <Link className="hover:text-blue-400" to="/stats">Stats</Link>
        <Link className="hover:text-blue-400" to="/admin">Admin</Link>
        <button className="ml-auto hover:text-blue-400" onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <main className="flex-grow container mx-auto p-4">{children}</main>
    </div>
  )
}
