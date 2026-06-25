'use client'

import { useEffect, useState } from 'react'

interface ComboData {
  hero1Id: number
  hero2Id: number
  hero1Name: string
  hero2Name: string
  hero1Img: string
  hero2Img: string
  matches: number
  wins: number
  winRate: number
}

export default function CombosPage() {
  const [combos, setCombos] = useState<ComboData[]>([])
  const [loading, setLoading] = useState(true)
  const [minMatches, setMinMatches] = useState(3)
  const [sortBy, setSortBy] = useState<'winRate' | 'matches'>('winRate')

  useEffect(() => {
    fetch('/api/combos').then(r => r.json()).then(data => {
      setCombos(data.combos || [])
      setLoading(false)
    })
  }, [])

  const filtered = combos
    .filter(c => c.matches >= minMatches)
    .sort((a, b) => sortBy === 'winRate' ? b.winRate - a.winRate : b.matches - a.matches)

  if (loading) return <div className="text-center py-20 text-gray-500 text-lg">Loading combos...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-200">🧩 Hero Combinations</h1>
        <div className="flex items-center gap-3">
          <select
            value={minMatches}
            onChange={e => setMinMatches(Number(e.target.value))}
            className="bg-[#1a1a2e] border border-red-900/20 rounded px-3 py-1.5 text-sm text-gray-300"
          >
            <option value={1}>Min 1 game</option>
            <option value={3}>Min 3 games</option>
            <option value={5}>Min 5 games</option>
            <option value={10}>Min 10 games</option>
          </select>
          <button
            onClick={() => setSortBy('winRate')}
            className={`px-3 py-1 rounded text-xs font-medium ${sortBy === 'winRate' ? 'bg-red-600 text-white' : 'bg-[#1a1a2e] text-gray-400'}`}
          >
            By Win Rate
          </button>
          <button
            onClick={() => setSortBy('matches')}
            className={`px-3 py-1 rounded text-xs font-medium ${sortBy === 'matches' ? 'bg-red-600 text-white' : 'bg-[#1a1a2e] text-gray-400'}`}
          >
            By Matches
          </button>
        </div>
      </div>

      <div className="bg-[#12121a] border border-red-900/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d0d15] text-gray-400 text-xs uppercase">
                <th className="p-3 text-left w-8">#</th>
                <th className="p-3 text-left">Hero 1</th>
                <th className="p-3 text-left">Hero 2</th>
                <th className="p-3 text-right">Matches</th>
                <th className="p-3 text-right">Wins</th>
                <th className="p-3 text-right">Win Rate</th>
                <th className="p-3" style={{ width: '30%' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={`${c.hero1Id}_${c.hero2Id}`} className="border-t border-gray-800 hover:bg-white/[0.02]">
                  <td className="p-3 text-gray-500">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={c.hero1Img} className="w-7 h-7 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <span className="text-gray-200">{c.hero1Name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={c.hero2Img} className="w-7 h-7 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <span className="text-gray-200">{c.hero2Name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-gray-400">{c.matches}</td>
                  <td className="p-3 text-right text-gray-400">{c.wins}</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${c.winRate >= 0.6 ? 'text-green-400' : c.winRate >= 0.45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {(c.winRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${c.winRate >= 0.6 ? 'bg-green-500' : c.winRate >= 0.45 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(c.winRate * 100, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600">No combos with {minMatches}+ matches yet</div>
        )}
      </div>
    </div>
  )
}
