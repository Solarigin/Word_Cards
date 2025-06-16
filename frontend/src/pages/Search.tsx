import { useState } from 'react'
import { searchWord } from '../api'
import { Link } from 'react-router-dom'

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
    <div className="p-4 flex flex-col gap-2">
      <input
        className="border p-2"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="border p-2" onClick={handleSearch}>
        Search
      </button>
      <ul>
        {results.map((w) => (
          <li key={w.id}>
            <Link className="text-blue-500" to={`/study#${w.id}`}>{w.word_en}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
