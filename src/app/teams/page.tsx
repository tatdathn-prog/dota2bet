'use client'

import { useEffect, useState } from 'react'

interface TeamData {
  id: number
  name: string
  tag: string
  region: string
  stats: {
    matches: number
    wins: number
    losses: number
    winRate: number
    recentForm: string
  }
  topHeroes: Array<{ heroId: number; heroName: string; picks: number; wins: number; wr: number }>
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [regionFilter, setRegionFilter] = useState<'all' | 'EU' | 'NA'>('all')

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(data => {
      setTeams(data.teams || [])
      setLoading(false)
    })
  }, [])

  const filtered = teams
    .filter(t => regionFilter === 'all' || t.region === regionFilter)
    .filter(t => t.stats.matches > 0)
    .sort((a, b) => b.stats.winRate - a.stats.winRate)

  if (loading) return <div className="text-center py-20 text-gray-500 text-lg">Loading teams...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-200">👥 Team Statistics</h1>
        <div className="flex gap-2">
          {(['all', 'EU', 'NA'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-1 rounded text-xs font-medium ${regionFilter === r ? 'bg-red-600 text-white' : 'bg-[#1a1a2e] text-gray-400'}`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <div
            key={t.id}
            className="bg-[#12121a] border border-red-900/20 rounded-lg overflow-hidden hover:border-red-900/40 transition-colors"
          >
            {/* Team card */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-200">{t.name}</h3>
                  <span className="text-xs text-gray-500">{t.tag} · {t.region}</span>
                </div>
                <span className={`text-lg font-bold ${t.stats.winRate >= 0.6 ? 'text-green-400' : t.stats.winRate >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {(t.stats.winRate * 100).toFixed(1)}%
                </span>
              </div>

              {/* Record bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-800">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${t.stats.winRate * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {t.stats.wins}W - {t.stats.losses}L
                </span>
              </div>

              {/* Recent form */}
              <div className="flex gap-1 mt-2">
                {(t.stats.recentForm || '').split('').map((char, i) => (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${
                      char === 'W' ? 'bg-green-900 text-green-400' : char === 'L' ? 'bg-red-900 text-red-400' : 'bg-gray-800'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </div>

              <div className="text-xs text-gray-600 mt-2">
                {t.stats.matches} matches · Click to expand
              </div>
            </div>

            {/* Expanded: Hero picks */}
            {expanded === t.id && (
              <div className="border-t border-gray-800 p-4 bg-[#0f0f18]">
                <h4 className="text-xs uppercase text-gray-500 mb-3">Most Picked Heroes</h4>
                <div className="space-y-2">
                  {t.topHeroes.map((h, i) => (
                    <div key={h.heroId} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 w-4">{i + 1}</span>
                      <span className="flex-1 text-gray-300">{h.heroName}</span>
                      <span className="text-xs text-gray-500">{h.picks} games</span>
                      <span className={`text-xs font-medium ${h.wr >= 0.6 ? 'text-green-400' : 'text-gray-500'}`}>
                        {(h.wr * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-600">No team data yet</div>
      )}
    </div>
  )
}
