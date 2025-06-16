import { Link } from 'react-router-dom'
export default function Dashboard() {
  return (
    <div className="p-4 flex flex-col gap-2">
      <Link className="text-blue-500" to="/study">Start Studying</Link>
      <Link className="text-blue-500" to="/search">Search</Link>
      <Link className="text-blue-500" to="/stats">Stats</Link>
      <Link className="text-blue-500" to="/admin">Admin</Link>
    </div>
  )
}
