'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HeroData {
  id: number
  name: string
  img: string
  roles: string[]
  stats: {
    carry: { picks: number; wins: number; wr: number }
    mid: { picks: number; wins: number; wr: number }
    offlane: { picks: number; wins: number; wr: number }
    support: { picks: number; wins: number; wr: number }
  }
  overall: { picks: number; wins: number; wr: number; bans: number }
}

type SortKey = 'overall.wr' | 'carry.wr' | 'mid.wr' | 'offlane.wr' | 'support.wr' | 'picks' | 'bans'
type Position = 'all' | 'carry' | 'mid' | 'offlane' | 'support'

export default function HeroesPage() {
  const [heroes, setHeroes] = useState<HeroData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('overall.wr')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState<Position>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/heroes').then(r => r.json()).then(data => {
      setHeroes(data.heroes || [])
      setLoading(false)
    })
  }, [])

  const sorted = [...heroes]
    .filter(h => {
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filter !== 'all') {
        const wr = h.stats[filter]?.wr || 0
        return h.stats[filter]?.picks > 0
      }
      return h.overall.picks > 0
    })
    .sort((a, b) => {
      const getVal = (h: HeroData, key: SortKey) => {
        const [category, subkey] = key.split('.')
        if (category === 'overall') return h.overall[subkey as 'wr' | 'picks' | 'wins']
        if (category === 'carry' || category === 'mid' || category === 'offlane' || category === 'support')
          return h.stats[category][subkey as 'wr' | 'picks' | 'wins']
        return 0
      }
      const va = getVal(a, sortBy), vb = getVal(b, sortBy)
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  if (loading) return <div className="text-center py-20 text-gray-500 text-lg">Đang tải tướng...</div>

  const chartData = sorted.slice(0, 10).map(h => ({
    name: h.name,
    'Win Rate': (h.overall.wr * 100),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-200">🦸 Thống Kê Tướng</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Tìm tướng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#1a1a2e] border border-red-900/20 rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-red-500/50 w-48"
        />
        {(['all', 'carry', 'mid', 'offlane', 'support'] as Position[]).map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === p ? 'bg-red-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            {p === 'all' ? 'Tất Cả' : p === 'carry' ? 'Carry' : p === 'mid' ? 'Mid' : p === 'offlane' ? 'Offlane' : 'Support'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#12121a] border border-red-900/20 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-amber-400 mb-4">
          Top 10 Tướng Theo Tỉ Lệ Thắng
          {filter !== 'all' && ` — ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#aaa' }}
            />
            <Bar dataKey="Win Rate" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={chartData[i]['Win Rate'] >= 55 ? '#22c55e' : chartData[i]['Win Rate'] >= 45 ? '#eab308' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-[#12121a] border border-red-900/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d0d15] text-gray-400 text-xs uppercase">
                <th className="p-3 text-left w-8">#</th>
                <th className="p-3 text-left">Tướng</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('overall.wr')}>Tổng WR {sortBy === 'overall.wr' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('carry.wr')}>Carry WR {sortBy === 'carry.wr' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('mid.wr')}>Mid WR {sortBy === 'mid.wr' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('offlane.wr')}>Offlane WR {sortBy === 'offlane.wr' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('support.wr')}>Support WR {sortBy === 'support.wr' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('picks')}>Pick {sortBy === 'picks' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('bans')}>Ban {sortBy === 'bans' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h, i) => (
                <tr key={h.id} className="border-t border-gray-800 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 text-gray-500">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={h.img}
                        alt={h.name}
                        className="w-8 h-8 rounded"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="font-medium text-gray-200">{h.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${h.overall.wr >= 0.55 ? 'text-green-400' : h.overall.wr >= 0.45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {(h.overall.wr * 100).toFixed(1)}%
                    </span>
                  </td>
                  {(['carry', 'mid', 'offlane', 'support'] as const).map(pos => (
                    <td key={pos} className="p-3 text-right">
                      {h.stats[pos].picks > 0 ? (
                        <span className={h.stats[pos].wr >= 0.55 ? 'text-green-400' : h.stats[pos].wr >= 0.45 ? 'text-yellow-400' : 'text-red-400'}>
                          {(h.stats[pos].wr * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-700">-</span>
                      )}
                    </td>
                  ))}
                  <td className="p-3 text-right text-gray-400">{h.overall.picks}</td>
                  <td className="p-3 text-right text-gray-400">{h.overall.bans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <div className="text-center py-10 text-gray-600">Không tìm thấy tướng nào</div>
        )}
      </div>
    </div>
  )
}
