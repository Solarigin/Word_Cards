import { useEffect, useState } from 'react'
import { fetchToday, reviewWord } from '../api'
import Layout from '../components/Layout'

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

  if (!current)
    return (
      <Layout>
        <div>All done!</div>
      </Layout>
    )

  return (
    <Layout>
      <div className="flex flex-col items-center gap-4">
        <div
          className="border p-8 text-center w-64 h-40 flex items-center justify-center cursor-pointer bg-white shadow rounded"
          onClick={() => setShowBack((v) => !v)}
        >
          {showBack ? current.word_zh : current.word_en}
        </div>
        {showBack && (
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                className="border rounded px-2 shadow"
                onClick={() => handleQuality(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
