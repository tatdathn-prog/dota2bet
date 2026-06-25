/**
 * Telegram Live Match Notifier
 * 
 * Quét OpenDota live endpoint mỗi 60s, phát hiện trận TI2026 sắp bắt đầu,
 * gửi thông báo Telegram trước 5 phút.
 * 
 * Chạy: npx tsx scripts/notifier.ts
 * Dừng: Ctrl+C
 */

const OPENDOTA_LIVE = 'https://api.opendota.com/api/live'
const POLL_INTERVAL = 60_000 // 60 giây
const NOTIFY_BEFORE = 5 * 60_000 // 5 phút

// === CONFIG: Điền token + chat ID ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

const TI_TEAMS = [
  'Team Spirit', 'Nigma Galaxy', 'Virtus.pro', 'NAVI', 'Natus Vincere',
  'MOUZ', 'Yellow Submarine', 'PARIVISION', 'TEAM VISION', 'Power Rangers',
  'L1GA TEAM', 'GamerLegion', 'The Bug', 'GGB', '4A+I',
  'OG', 'Team Liquid', 'Gaimin Gladiators', 'Tundra', 'BetBoom',
  'enjoy', 'Team Bald', 'MODUS', 'HULIGANI', 'VP.Prodigy', 'Rune Eaters',
]

interface LiveMatch {
  match_id: string
  activate_time: number
  deactivate_time: number
  team_name_radiant: string
  team_name_dire: string
  league_id: number
  lobby_type: number
  game_time: number
  radiant_score: number
  dire_score: number
  spectators: number
  radiant_lead: number
  players: any[]
}

// Track notified matches to avoid spam
const notifiedMatches = new Set<string>()
const pendingMatches = new Map<string, { match: LiveMatch; activateTime: number }>()

async function sendTelegram(message: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[TG] ⚠️ Chưa cấu hình Telegram token/chat ID')
    console.log('[TG] Message would be:', message)
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('[TG] Send failed:', e)
    return false
  }
}

function isTIProMatch(m: LiveMatch): boolean {
  return (
    m.league_id > 0 &&
    m.lobby_type === 1 &&
    TI_TEAMS.some(t => 
      m.team_name_radiant?.toLowerCase().includes(t.toLowerCase()) ||
      m.team_name_dire?.toLowerCase().includes(t.toLowerCase())
    )
  )
}

function formatMatchMsg(match: LiveMatch, timeUntil: string): string {
  const gameTime = match.game_time > 0 
    ? `<b>🔴 LIVE</b> — ${Math.floor(match.game_time/60)}:${String(match.game_time%60).padStart(2,'0')}\n`
    : `<b>⏰ Bắt đầu ${timeUntil}!</b>\n`
  
  const scoreRow = match.game_time > 0
    ? `Tỉ số: <b>${match.radiant_score} - ${match.dire_score}</b>\n`
    : ''

  const leadRow = match.radiant_lead !== 0 && match.game_time > 0
    ? `Gold: ${match.radiant_lead > 0 ? '🟢 Radiant' : '🔴 Dire'} dẫn ${Math.abs(Math.floor(match.radiant_lead/1000))}k\n`
    : ''

  return `
🏆 <b>TI 2026 Qualifier</b>

${match.team_name_radiant} vs ${match.team_name_dire}

${gameTime}${scoreRow}${leadRow}👁 ${match.spectators} người xem
  `.trim()
}

function formatDraftMsg(match: LiveMatch): string {
  const radiantHeroes = match.players?.filter((p: any) => p.team === 0 && p.hero_id > 0) || []
  const direHeroes = match.players?.filter((p: any) => p.team === 1 && p.hero_id > 0) || []
  
  if (radiantHeroes.length === 0 && direHeroes.length === 0) return ''
  
  const radiantStr = radiantHeroes.map((p: any) => `🟢 Hero ${p.hero_id}`).join('\n')
  const direStr = direHeroes.map((p: any) => `🔴 Hero ${p.hero_id}`).join('\n')
  
  const allPicked = radiantHeroes.length === 5 && direHeroes.length === 5
  
  return `
📋 <b>Draft ${allPicked ? 'Hoàn Tất' : 'Đang Diễn Ra'}</b>

${radiantStr}

${direStr}
  `.trim()
}

async function checkLiveMatches() {
  try {
    const res = await fetch(OPENDOTA_LIVE)
    if (!res.ok) return
    const matches: LiveMatch[] = await res.json()

    const tiMatches = matches.filter(isTIProMatch)
    const now = Date.now() / 1000

    // Check for newly activated matches
    for (const match of tiMatches) {
      const matchKey = match.match_id
      
      // Skip already notified
      if (notifiedMatches.has(matchKey)) continue
      
      // Match is live right now (just started or in progress)
      if (match.deactivate_time === 0 && match.game_time >= 0) {
        const msg = formatMatchMsg(match, 'ngay bây giờ') + '\n' + formatDraftMsg(match)
        const sent = await sendTelegram(msg)
        if (sent) {
          notifiedMatches.add(matchKey)
          console.log(`[TG] ✓ Notified: ${match.team_name_radiant} vs ${match.team_name_dire}`)
        }
      }
    }

    // Also check for upcoming matches via activate_time
    for (const match of tiMatches) {
      const matchKey = match.match_id
      if (notifiedMatches.has(matchKey)) continue
      
      // Future match: activate_time is in the future
      if (match.activate_time > now && match.game_time <= 0) {
        const timeUntil = match.activate_time - now
        
        if (timeUntil < NOTIFY_BEFORE / 1000) {
          // Within 5 min window — notify!
          const minutes = Math.floor(timeUntil / 60)
          const seconds = Math.floor(timeUntil % 60)
          const timeStr = minutes > 0 ? `${minutes} phút ${seconds}s nữa` : `${seconds}s nữa`
          
          const msg = formatMatchMsg({ ...match, game_time: 0, radiant_score: 0, dire_score: 0, radiant_lead: 0 }, timeStr)
          const sent = await sendTelegram(msg)
          if (sent) {
            notifiedMatches.add(matchKey)
            console.log(`[TG] ✓ Pre-match notify (${timeStr}): ${match.team_name_radiant} vs ${match.team_name_dire}`)
          }
        }
      }
    }

    return tiMatches.length
  } catch (e) {
    console.error('[Poller] Error:', e)
    return 0
  }
}

async function main() {
  console.log('🤖 TI 2026 Telegram Notifier')
  console.log('═══════════════════════════')
  console.log(`Quét mỗi ${POLL_INTERVAL/1000}s | Thông báo trước ${NOTIFY_BEFORE/1000}s`)
  
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('')
    console.log('⚠️  CHƯA CẤU HÌNH TELEGRAM!')
    console.log('')
    console.log('Cách lấy token + chat ID:')
    console.log('1. Mở Telegram, tìm @BotFather → /newbot → đặt tên → copy token')
    console.log('2. Tìm @userinfobot → /start → copy chat ID')
    console.log('3. Tạo file .env.local trong thư mục project:')
    console.log('   TELEGRAM_BOT_TOKEN=123456:ABC...')
    console.log('   TELEGRAM_CHAT_ID=123456789')
    console.log('')
    console.log('Đang chạy chế độ test (in ra console)...')
    console.log('')
  }

  // Initial check
  const count = await checkLiveMatches()
  console.log(`[${new Date().toLocaleTimeString()}] Đã quét — ${count} trận TI đang live/sắp đấu`)

  // Periodic check
  setInterval(async () => {
    const c = await checkLiveMatches()
    if (c && c > 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Đã quét — ${c} trận TI`)
    }
  }, POLL_INTERVAL)
}

main().catch(console.error)
