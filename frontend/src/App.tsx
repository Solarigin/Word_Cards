import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Study from './pages/Study'
import Search from './pages/Search'
import Stats from './pages/Stats'
import Admin from './pages/Admin'
import { useAuth } from './store/auth'
import './index.css'

export default function App() {
  const token = useAuth((s) => s.token)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={token ? <Dashboard /> : <Login />} />
        <Route path="/study" element={<Study />} />
        <Route path="/search" element={<Search />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
