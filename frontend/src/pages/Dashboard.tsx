import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function Dashboard() {
  return (
    <Layout>
      <div className="grid gap-4 max-w-md mx-auto pt-4">
        <Link className="border rounded px-4 py-2 shadow bg-blue-500 text-white" to="/study">
          Start Studying
        </Link>
        <Link className="border rounded px-4 py-2 shadow bg-green-500 text-white" to="/search">
          Search
        </Link>
        <Link className="border rounded px-4 py-2 shadow bg-purple-500 text-white" to="/stats">
          Stats
        </Link>
        <Link className="border rounded px-4 py-2 shadow bg-gray-700 text-white" to="/admin">
          Admin
        </Link>
      </div>
    </Layout>
  )
}
