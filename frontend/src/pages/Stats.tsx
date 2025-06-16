import { useEffect, useState } from 'react'
import { statsOverview } from '../api'
import Layout from '../components/Layout'

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

  if (!data) return (
    <Layout>
      <div>Loading...</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="grid sm:grid-cols-3 gap-4 text-center">
        <div className="shadow rounded p-4 bg-white">
          <div className="text-2xl font-bold">{data.reviewed}</div>
          <div className="text-gray-500">Reviewed</div>
        </div>
        <div className="shadow rounded p-4 bg-white">
          <div className="text-2xl font-bold">{data.due}</div>
          <div className="text-gray-500">Due Today</div>
        </div>
        <div className="shadow rounded p-4 bg-white">
          <div className="text-2xl font-bold">
            {data.next_due ? new Date(data.next_due).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-gray-500">Next Due</div>
        </div>
      </div>
    </Layout>
  )
}
