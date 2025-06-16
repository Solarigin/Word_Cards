import { useState } from 'react'
import { searchWord } from '../api'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

interface Word {
  id: number
  word_en: string
  word_zh: string
}

export default function Search() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Word[]>([])

  const handleSearch = async () => {
    const data = await searchWord(q)
    setResults(data)
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4 max-w-xl mx-auto">
        <div className="flex gap-2">
          <input
            className="border p-2 flex-grow"
            placeholder="Search word"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="border rounded px-4 py-2 shadow bg-white hover:bg-gray-100" onClick={handleSearch}>
            Search
          </button>
        </div>
        <ul className="space-y-2">
          {results.map((w) => (
            <li key={w.id} className="p-2 border rounded shadow bg-white">
              <Link className="text-blue-500 font-semibold" to={`/study#${w.id}`}>{w.word_en}</Link>
              <div className="text-gray-600">{w.word_zh}</div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
