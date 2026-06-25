'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface LiveMatch {
  matchId: string
  radiantTeam: string
  direTeam: string
  radiantScore: number
  direScore: number
  radiantLead: number
  gameTime: number
  spectators: number
  status: string
  radiantHeroes: Array<{ heroId: number; heroName: string; heroImg: string; playerName: string }>
  direHeroes: Array<{ heroId: number; heroName: string; heroImg: string; playerName: string }>
  prediction?: {
    radiantWinProb: number
    direWinProb: number
    confidence: number
    keyFactors: string[]
  }
  commentary?: {
    title: string
    draftAnalysis: string[]
    winConditions: { radiant: string[]; dire: string[] }
    keyMatchups: string[]
    powerSpikes: string[]
    prediction: string
    overall: string
  }
  liveAnalysis?: {
    phase: string
    dynamicWinProb: { radiant: number; dire: number; source: string }
    postDraftProb: { radiant: number; dire: number }
    analysis: string[]
    keyFighters: string[]
    winConditionNow: string
    comebackPotential: string
    netWorthAnalysis: string
    gameState: string
  }
  timeline?: Array<{ time: number; radiantLead: number; radiantScore: number; direScore: number }>
}

interface DashboardData {
  liveMatches: LiveMatch[]
  topHeroes: Array<{ heroId: number; heroName: string; winRate: number; picks: number }>
  topCombos: Array<{ hero1: string; hero2: string; winRate: number; matches: number }>
  topTeams: Array<{ id: number; name: string; winRate: number; record: string; form: string }>
  upcomingMatches: Array<{ id: number; radiant: string; dire: string; tournament: string; time: string }>
  lastUpdated: string
}

function formatGameTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function WinRateBadge({ wr }: { wr: number }) {
  const color = wr >= 0.55 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    : wr >= 0.45 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    : 'text-red-400 bg-red-400/10 border-red-400/20'
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {(wr * 100).toFixed(1)}%
    </span>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('all')

  const periods = [
    { key: 'day', label: '24h' },
    { key: 'week', label: '7d' },
    { key: 'month', label: '30d' },
    { key: 'all', label: 'All' },
  ]

  const fetchData = async () => {
    try {
      const [dashRes, liveRes] = await Promise.all([
        fetch(`/api/dashboard?period=${period}`),
        fetch('/api/live'),
      ])
      const dashData = dashRes.ok ? await dashRes.json() : {}
      const liveData = liveRes.ok ? await liveRes.json() : { matches: [] }
      setData({ ...dashData, liveMatches: liveData.matches || [] })
    } catch { setError('API unavailable') }
    setLoading(false)
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/update', { method: 'POST' })
      await fetchData()
    } catch { }
    setRefreshing(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Đang tải dữ liệu TI 2026...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <p className="text-red-400 text-lg mb-2">⚠️ Lỗi Kết Nối</p>
        <p className="text-gray-500 text-sm mb-4">Kiểm tra server dev đang chạy</p>
        <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">Thử Lại</button>
      </div>
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* === TOP BAR === */}
      <div className="flex items-center justify-between pb-4 border-b border-red-900/20">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🏆</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-red-500">TI</span>
              <span className="text-amber-400">2026</span>
              <span className="text-gray-400 font-normal text-lg ml-2">Qualifier Stats</span>
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              {data.liveMatches.length > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-medium">{data.liveMatches.length} LIVE</span>
                </span>
              )}
              <span className="text-xs text-gray-600">
                {data.upcomingMatches.length} trận · Cập nhật {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-sm font-medium text-red-400 transition-all disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
          {refreshing ? 'Đang tải...' : 'Cập Nhật Dữ Liệu'}
        </button>
      </div>

      {/* === LIVE MATCHES === */}
      {data.liveMatches.length > 0 && (
        <div className="space-y-6">
          {data.liveMatches.map((m, i) => (
            <div key={m.matchId + i} className="bg-[#0b0b14] border border-red-900/30 rounded-xl overflow-hidden shadow-2xl shadow-red-900/5">
              {/* Score Header */}
              <div className="p-5 bg-gradient-to-r from-red-950/30 via-[#0d0d18] to-red-950/30">
                <div className="flex items-center justify-between">
                  {/* Radiant */}
                  <div className="flex-1 text-right">
                    <div className="text-xs text-gray-500 mb-1">RADIANT</div>
                    <div className={`text-lg font-bold ${m.radiantLead > 0 ? 'text-green-400' : 'text-gray-200'}`}>
                      {m.radiantTeam}
                    </div>
                  </div>

                  {/* Score Center */}
                  <div className="px-8 text-center">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-gray-100 tabular-nums">{m.radiantScore}</span>
                      <span className="text-gray-600 text-xl font-light">:</span>
                      <span className="text-3xl font-black text-gray-100 tabular-nums">{m.direScore}</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-500">⏱ {formatGameTime(m.gameTime)}</span>
                      <span className="text-xs text-gray-600">👁 {m.spectators}</span>
                    </div>
                    {m.radiantLead !== 0 && (
                      <div className={`text-xs mt-1 font-semibold ${
                        m.radiantLead > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {m.radiantLead > 0 ? '🟢 Radiant' : '🔴 Dire'} dẫn {Math.abs(m.radiantLead).toLocaleString()} gold
                      </div>
                    )}
                  </div>

                  {/* Dire */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">DIRE</div>
                    <div className={`text-lg font-bold ${m.radiantLead < 0 ? 'text-green-400' : 'text-gray-200'}`}>
                      {m.direTeam}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              {m.timeline && m.timeline.length >= 2 && (
                <div className="px-5 pb-2">
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">📈 Gold Lead Timeline</h4>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={m.timeline.map((t: any) => ({
                      time: Math.floor(t.time / 60) + '\u2032' + String(t.time % 60).padStart(2, '0'),
                      goldLead: t.radiantLead,
                      radiantScore: t.radiantScore,
                      direScore: t.direScore,
                    }))}>
                      <defs>
                        <linearGradient id="goldGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="goldRed" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{fontSize: 9, fill: '#555'}} interval="preserveStartEnd" />
                      <YAxis tick={{fontSize: 9, fill: '#555'}} tickFormatter={(v: number) => v > 0 ? '+'+(v/1000).toFixed(1)+'k' : v < 0 ? (v/1000).toFixed(1)+'k' : '0'} width={55} />
                      <Tooltip 
                        contentStyle={{background:'#0d0d18',border:'1px solid #333',borderRadius:8,fontSize:11}}
                        labelStyle={{color:'#999'}}
                        formatter={(value: number) => [value > 0 ? `+${(value/1000).toFixed(1)}k Radiant` : `${(value/1000).toFixed(1)}k Dire`, 'Gold Lead']}
                      />
                      <ReferenceLine y={0} stroke="#333" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="goldLead" stroke="#888" fillOpacity={1} fill="url(#goldGreen)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Draft & Prediction Row */}
              <div className="p-5 border-t border-red-900/10 grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Radiant Draft */}
                <div className="lg:col-span-1">
                  <h4 className="text-[10px] uppercase tracking-wider text-green-500/70 mb-2 font-semibold">Pick Radiant</h4>
                  <div className="space-y-1.5">
                    {m.radiantHeroes.map(h => (
                      <div key={h.heroId} className="flex items-center gap-2">
                        <img src={h.heroImg} className="w-6 h-6 rounded"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-300 truncate">{h.heroName}</div>
                          <div className="text-[10px] text-gray-600 truncate">{h.playerName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Analysis Center */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center gap-2">
                  {/* Dynamic Win Probability */}
                  {m.liveAnalysis ? (
                    <>
                      <div className="text-center w-full">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Tỉ lệ thắng LIVE</div>
                        <div className="flex items-center gap-0.5 h-5 rounded-full overflow-hidden bg-gray-800 mb-1">
                          <div
                            className="bg-emerald-600 h-full transition-all flex items-center justify-end px-1.5"
                            style={{ width: `${m.liveAnalysis.dynamicWinProb.radiant * 100}%` }}
                          >
                            <span className="text-[10px] font-bold tabular-nums">
                              {m.liveAnalysis.dynamicWinProb.radiant > 0.15 ? `${(m.liveAnalysis.dynamicWinProb.radiant * 100).toFixed(0)}%` : ''}
                            </span>
                          </div>
                          <div
                            className="bg-red-600 h-full transition-all flex items-center px-1.5"
                            style={{ width: `${m.liveAnalysis.dynamicWinProb.dire * 100}%` }}
                          >
                            <span className="text-[10px] font-bold tabular-nums">
                              {m.liveAnalysis.dynamicWinProb.dire > 0.15 ? `${(m.liveAnalysis.dynamicWinProb.dire * 100).toFixed(0)}%` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.liveAnalysis.dynamicWinProb.radiant > m.liveAnalysis.dynamicWinProb.dire ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                        }`}>
                          {m.liveAnalysis.phase}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-600 text-center leading-tight">
                        {m.liveAnalysis.gameState}
                      </div>
                      {/* Post-draft vs Live comparison */}
                      {m.prediction && (
                        <div className="text-[9px] text-gray-600 text-center mt-1">
                          Draft: {(m.prediction.radiantWinProb*100).toFixed(0)}-{(m.prediction.direWinProb*100).toFixed(0)} → Live: {(m.liveAnalysis.dynamicWinProb.radiant*100).toFixed(0)}-{(m.liveAnalysis.dynamicWinProb.dire*100).toFixed(0)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-600 text-center">
                      {m.status === 'drafting' ? '🔄 Đang draft...' : '⏳ Đợi dữ liệu...'}
                    </div>
                  )}
                </div>

                {/* Dire Draft */}
                <div className="lg:col-span-1">
                  <h4 className="text-[10px] uppercase tracking-wider text-red-500/70 mb-2 font-semibold">Pick Dire</h4>
                  <div className="space-y-1.5">
                    {m.direHeroes.map(h => (
                      <div key={h.heroId} className="flex items-center gap-2">
                        <img src={h.heroImg} className="w-6 h-6 rounded"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-300 truncate">{h.heroName}</div>
                          <div className="text-[10px] text-gray-600 truncate">{h.playerName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Analysis Details + Commentary */}
                <div className="lg:col-span-2">
                  {m.liveAnalysis ? (
                    <div className="space-y-3">
                      {/* Live Analysis */}
                      <div className="bg-red-400/5 border border-red-400/10 rounded-lg p-3">
                        <h4 className="text-[10px] uppercase tracking-wider text-red-400/70 mb-2 font-semibold">🔴 Phân Tích Trực Tiếp</h4>
                        <div className="space-y-1.5">
                          {m.liveAnalysis.analysis.map((line, j) => (
                            <p key={j} className="text-xs text-gray-300 leading-relaxed">{line}</p>
                          ))}
                        </div>
                        
                        {m.liveAnalysis.keyFighters.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-400/10">
                            <h4 className="text-[10px] uppercase tracking-wider text-amber-400/70 mb-1 font-semibold">👊 Mấu Chốt Combat</h4>
                            {m.liveAnalysis.keyFighters.map((f, j) => (
                              <p key={j} className="text-[10px] text-gray-400">{f}</p>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-2 pt-2 border-t border-red-400/10">
                          <p className="text-[10px] text-gray-400">{m.liveAnalysis.winConditionNow}</p>
                        </div>
                        
                        <div className="mt-1">
                          <p className="text-[10px] text-gray-500 italic">{m.liveAnalysis.comebackPotential}</p>
                        </div>
                        
                        <div className="mt-1">
                          <p className="text-[10px] text-gray-600">{m.liveAnalysis.netWorthAnalysis}</p>
                        </div>
                      </div>
                      
                      {/* Commentary (collapsible) */}
                      {m.commentary && (
                        <details className="text-xs">
                          <summary className="text-[10px] uppercase tracking-wider text-amber-500/70 cursor-pointer font-semibold">📋 Phân Tích Draft (click mở rộng)</summary>
                          <div className="mt-2 space-y-2 text-gray-500">
                            {m.commentary.draftAnalysis.slice(0, 3).map((line, j) => (
                              <p key={j} className="text-[11px] leading-relaxed">{line}</p>
                            ))}
                            {m.commentary.keyMatchups.length > 0 && (
                              <div className="pt-1">
                                {m.commentary.keyMatchups.map((mu, j) => (
                                  <p key={j} className="text-[11px]">{mu}</p>
                                ))}
                              </div>
                            )}
                            <div className="bg-amber-400/5 border border-amber-400/10 rounded p-2">
                              <p className="text-[11px] text-amber-300/80">{m.commentary.prediction}</p>
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : m.commentary ? (
                    <div className="space-y-3">
                      {/* Commentary only (draft just completed, no game data) */}
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-1.5 font-semibold">📋 Phân Tích Draft</h4>
                        <div className="space-y-1">
                          {m.commentary.draftAnalysis.map((line, j) => (
                            <p key={j} className="text-xs text-gray-400 leading-relaxed">{line}</p>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <h4 className="text-[10px] uppercase tracking-wider text-green-500/70 mb-1 font-semibold">🟢 {m.radiantTeam}</h4>
                          <ul className="space-y-0.5">
                            {m.commentary.winConditions.radiant.slice(0, 2).map((c, j) => (
                              <li key={j} className="text-[11px] text-gray-500 leading-relaxed">{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase tracking-wider text-red-500/70 mb-1 font-semibold">🔴 {m.direTeam}</h4>
                          <ul className="space-y-0.5">
                            {m.commentary.winConditions.dire.slice(0, 2).map((c, j) => (
                              <li key={j} className="text-[11px] text-gray-500 leading-relaxed">{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="bg-amber-400/5 border border-amber-400/10 rounded-lg p-2.5">
                        <p className="text-xs text-amber-300/80 font-medium leading-relaxed">{m.commentary.prediction}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-gray-600">Bình luận sẽ có sau khi draft hoàn tất</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === STATS GRID === */}
      <div className="space-y-4">
        {/* Period Tabs */}
        <div className="flex items-center gap-1">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                period === p.key
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hero Stats */}
        <div className="bg-[#0d0d18] border border-gray-800/50 rounded-xl p-4 hover:border-red-900/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">🦸 Top Tướng</h3>
            <Link href="/heroes" className="text-[10px] text-gray-600 hover:text-red-400">Xem hết →</Link>
          </div>
          <div className="space-y-2">
            {data.topHeroes.slice(0, 5).map((h, i) => (
              <div key={h.heroId} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-300 truncate">{h.heroName}</span>
                <span className="text-[10px] text-gray-600">{h.picks}g</span>
                <WinRateBadge wr={h.winRate} />
              </div>
            ))}
          </div>
        </div>

        {/* Team Rankings */}
        <div className="bg-[#0d0d18] border border-gray-800/50 rounded-xl p-4 hover:border-red-900/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">👥 Top Đội</h3>
            <Link href="/teams" className="text-[10px] text-gray-600 hover:text-red-400">Xem hết →</Link>
          </div>
          <div className="space-y-2">
            {data.topTeams.slice(0, 5).map((t, i) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-300 truncate">{t.name}</span>
                <span className="text-[10px] text-gray-500 font-mono">{t.form}</span>
                <WinRateBadge wr={t.winRate} />
              </div>
            ))}
          </div>
        </div>

        {/* Combos */}
        <div className="bg-[#0d0d18] border border-gray-800/50 rounded-xl p-4 hover:border-red-900/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">🧩 Combo Hay</h3>
            <Link href="/combos" className="text-[10px] text-gray-600 hover:text-red-400">Xem hết →</Link>
          </div>
          <div className="space-y-2">
            {data.topCombos.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-300 truncate">{c.hero1}+{c.hero2}</span>
                <span className="text-[10px] text-gray-600">{c.matches}g</span>
                <WinRateBadge wr={c.winRate} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-[#0d0d18] border border-gray-800/50 rounded-xl p-4 hover:border-red-900/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">📅 Gần Đây</h3>
            <Link href="/matches" className="text-[10px] text-gray-600 hover:text-red-400">Xem hết →</Link>
          </div>
          <div className="space-y-2">
            {data.upcomingMatches.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-gray-400 truncate">{m.radiant} vs {m.dire}</span>
                <span className="text-[10px] text-gray-600 truncate">{m.tournament}</span>
              </div>
            ))}
            {data.upcomingMatches.length === 0 && (
              <p className="text-xs text-gray-600">Nhấn Cập Nhật để tải dữ liệu</p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* === FOOTER NOTE === */}
      <div className="text-center text-[10px] text-gray-700 pt-4 border-t border-red-900/10">
        Dữ liệu: OpenDota API (Miễn phí) · Bayesian winrates · Tự động cập nhật 15s
      </div>
    </div>
  )
}
