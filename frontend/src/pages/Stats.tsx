import { useEffect, useState } from 'react'
import { statsOverview } from '../api'

interface StatsData {
  reviewed: number
  due: number
  next_due: string | null
}

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null)
  useEffect(() => {
    statsOverview().then(setData)
  }, [])

  if (!data) return <div className="p-4">Loading...</div>
  return (
    <pre className="p-4 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
  )
}
