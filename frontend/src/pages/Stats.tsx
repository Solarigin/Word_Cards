import { useEffect, useState } from 'react'
import { statsOverview } from '../api'

export default function Stats() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    statsOverview().then(setData)
  }, [])

  if (!data) return <div className="p-4">Loading...</div>
  return (
    <pre className="p-4 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
  )
}
