import { useEffect, useState } from 'react'
import { fetchToday, reviewWord } from '../api'

interface Word {
  id: number
  word_en: string
  word_zh: string
  sentence: string
}

export default function Study() {
  const [words, setWords] = useState<Word[]>([])
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    fetchToday().then(setWords)
  }, [])

  const current = words[index]
  const handleQuality = async (q: number) => {
    if (!current) return
    await reviewWord(current.id, q)
    setShowBack(false)
    setIndex((i) => i + 1)
  }

  if (!current) return <div className="p-4">All done!</div>

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      <div
        className="border p-8 text-center w-64 h-40 flex items-center justify-center cursor-pointer"
        onClick={() => setShowBack((v) => !v)}
      >
        {showBack ? current.word_zh : current.word_en}
      </div>
      {showBack && (
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              className="border px-2"
              onClick={() => handleQuality(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
