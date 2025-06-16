import { useState } from 'react'
import { login, register } from '../api'
import { useAuth } from '../store/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const setToken = useAuth((s) => s.setToken)

  const handleLogin = async () => {
    const data = await login(username, password)
    setToken(data.access_token)
  }

  const handleRegister = async () => {
    await register(username, password)
    await handleLogin()
  }

  return (
    <div className="p-4 max-w-sm mx-auto flex flex-col gap-2">
      <input
        className="border p-2"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="border p-2"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="bg-blue-500 text-white p-2" onClick={handleLogin}>
        Login
      </button>
      <button className="border p-2" onClick={handleRegister}>
        Register
      </button>
    </div>
  )
}
