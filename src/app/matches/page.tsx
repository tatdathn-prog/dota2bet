'use client'

import { useEffect, useState } from 'react'

interface MatchData {
  id: number
  radiantTeam: string
  direTeam: string
  radiantScore: number | null
  direScore: number | null
  winner: string | null
  status: string
  stage: string | null
  duration: string | null
  startTime: string
  tournament: string
  picks: Array<{ heroId: number; heroName: string; heroImg: string; side: string }>
}

function DraftLineup({ picks, side }: { picks: MatchData['picks']; side: 'radiant' | 'dire' }) {
  const teamPicks = picks.filter(p => p.side === side)
  if (teamPicks.length === 0) return <span className="text-gray-700 text-xs">Chưa có draft</span>
  
  return (
    <div className="flex gap-1.5 flex-wrap">
      {teamPicks.map(p => (
        <div key={p.heroId} className="flex flex-col items-center gap-0.5" title={p.heroName}>
          {p.heroImg ? (
            <img src={p.heroImg} className="w-9 h-9 rounded border border-gray-700 hover:border-gray-500 transition-colors"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center text-[9px] text-gray-600">
              {p.heroId}
            </div>
          )}
          <span className="text-[9px] text-gray-500 max-w-[40px] truncate text-center leading-tight">
            {p.heroName.length > 7 ? p.heroName.slice(0, 6) + '..' : p.heroName}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'completed'>('completed')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/matches').then(r => r.json()).then(data => {
      setMatches(data.matches || [])
      setLoading(false)
    })
  }, [])

  const upcoming = matches.filter(m => m.status === 'upcoming' || m.status === 'live')
  const completed = matches.filter(m => m.status === 'completed')

  const displayMatches = (tab === 'upcoming' ? upcoming : completed)
    .filter(m => {
      if (!search) return true
      const q = search.toLowerCase()
      return m.radiantTeam.toLowerCase().includes(q) || 
             m.direTeam.toLowerCase().includes(q) ||
             m.tournament.toLowerCase().includes(q)
    })

  if (loading) return <div className="text-center py-20 text-gray-500 text-lg">Đang tải trận đấu...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-200">📅 Trận Đấu</h1>
        <input
          type="text"
          placeholder="Tìm đội hoặc giải..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#1a1a2e] border border-red-900/20 rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-red-500/50 w-56"
        />
      </div>

      <div className="flex gap-2">
        {(['upcoming', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-red-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            {t === 'upcoming' ? `🔴 Sắp Diễn Ra (${upcoming.length})` : `✅ Đã Xong (${completed.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayMatches.map(m => (
          <div
            key={m.id}
            className="bg-[#0d0d18] border border-gray-800/50 rounded-lg overflow-hidden hover:border-red-900/30 transition-colors"
          >
            {/* Match Card */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  m.status === 'live' ? 'bg-red-900 text-red-400 animate-pulse' :
                  m.status === 'upcoming' ? 'bg-yellow-900 text-yellow-400' :
                  'bg-green-900 text-green-400'
                }`}>
                  {m.status === 'live' ? '🔴 LIVE' : m.status === 'upcoming' ? '⏰ SẮP ĐẤU' : '✅ XONG'}
                </span>
                <span className="text-[10px] text-gray-600">{m.tournament}</span>
              </div>

              <div className="flex items-center gap-4">
                {/* Left: Radiant */}
                <div className="flex-1 flex items-center gap-3 justify-end">
                  <div className="text-right">
                    <div className={`font-bold text-sm ${m.winner === 'radiant' ? 'text-green-400' : 'text-gray-300'}`}>
                      {m.radiantTeam}
                    </div>
                  </div>
                  {/* Radiant heroes */}
                  <DraftLineup picks={m.picks} side="radiant" />
                </div>

                {/* Center score */}
                <div className="text-center px-4 min-w-[80px]">
                  {m.status === 'upcoming' ? (
                    <div className="text-gray-500 font-bold text-sm">VS</div>
                  ) : (
                    <div className="text-xl font-black text-gray-200 tabular-nums">
                      {m.radiantScore ?? '-'} : {m.direScore ?? '-'}
                    </div>
                  )}
                  {m.duration && (
                    <div className="text-[10px] text-gray-600 mt-0.5">{m.duration}</div>
                  )}
                </div>

                {/* Right: Dire */}
                <div className="flex-1 flex items-center gap-3">
                  {/* Dire heroes */}
                  <DraftLineup picks={m.picks} side="dire" />
                  <div>
                    <div className={`font-bold text-sm ${m.winner === 'dire' ? 'text-green-400' : 'text-gray-300'}`}>
                      {m.direTeam}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-2 text-[10px] text-gray-600">
                {m.startTime}
                {m.stage && ` · ${m.stage}`}
              </div>
            </div>

            {/* Expanded Detail */}
            {expanded === m.id && m.picks.length > 0 && (
              <div className="border-t border-gray-800 p-4 bg-[#0a0a12]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-green-500/70 mb-2 font-semibold">
                      🟢 {m.radiantTeam}
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {m.picks.filter(p => p.side === 'radiant').map(p => (
                        <div key={p.heroId} className="flex flex-col items-center gap-1">
                          {p.heroImg ? (
                            <img src={p.heroImg} className="w-12 h-12 rounded border border-gray-700"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-600">
                              #{p.heroId}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-400 text-center leading-tight">{p.heroName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-red-500/70 mb-2 font-semibold">
                      🔴 {m.direTeam}
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {m.picks.filter(p => p.side === 'dire').map(p => (
                        <div key={p.heroId} className="flex flex-col items-center gap-1">
                          {p.heroImg ? (
                            <img src={p.heroImg} className="w-12 h-12 rounded border border-gray-700"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-600">
                              #{p.heroId}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-400 text-center leading-tight">{p.heroName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {displayMatches.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            {tab === 'upcoming' ? 'Chưa có trận sắp diễn ra' : 'Chưa có trận đã hoàn thành. Nhấn Cập Nhật Dữ Liệu ở Dashboard.'}
          </div>
        )}
      </div>
    </div>
  )
}
