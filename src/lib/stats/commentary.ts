/**
 * Dota 2 Bình Luận Viên Chuyên Nghiệp
 * 
 * Phân tích trận đấu như 1 BLV Dota chuyên nghiệp sau khi draft hoàn tất.
 */

import { positionToRole } from './roles'

interface DraftHero {
  heroId: number
  heroName: string
  position: number
  comfortScore: number
  globalWR: number
  counterInfo?: string[]
  synergyInfo?: string[]
}

interface CommentaryInput {
  radiantTeam: string
  direTeam: string
  radiantTeamWR: number
  direTeamWR: number
  radiantHeroes: DraftHero[]
  direHeroes: DraftHero[]
  prediction: {
    radiantWinProb: number
    direWinProb: number
    keyFactors: string[]
  }
  format: string
  seriesScore?: string
}

interface CommentaryOutput {
  title: string
  draftAnalysis: string[]
  winConditions: {
    radiant: string[]
    dire: string[]
  }
  keyMatchups: string[]
  powerSpikes: string[]
  prediction: string
  overall: string
}

const HERO_TIMINGS: Record<number, { early: number; mid: number; late: number }> = {
  1: { early: 3, mid: 6, late: 10 }, 67: { early: 3, mid: 6, late: 9 },
  109: { early: 2, mid: 5, late: 9 }, 94: { early: 4, mid: 8, late: 9 },
  44: { early: 4, mid: 6, late: 8 }, 114: { early: 5, mid: 7, late: 7 },
  48: { early: 5, mid: 7, late: 7 },
  17: { early: 5, mid: 8, late: 6 }, 106: { early: 6, mid: 8, late: 5 },
  120: { early: 5, mid: 8, late: 6 }, 13: { early: 5, mid: 9, late: 5 },
  39: { early: 6, mid: 8, late: 5 },
  2: { early: 7, mid: 7, late: 5 }, 129: { early: 7, mid: 7, late: 5 },
  96: { early: 7, mid: 7, late: 4 }, 33: { early: 6, mid: 8, late: 7 },
  97: { early: 5, mid: 8, late: 7 },
  3: { early: 8, mid: 6, late: 5 }, 26: { early: 8, mid: 6, late: 4 },
  5: { early: 8, mid: 5, late: 3 }, 86: { early: 7, mid: 6, late: 5 },
  90: { early: 7, mid: 7, late: 6 },
}

function getTeamTiming(heroes: DraftHero[]): { early: number; mid: number; late: number; total: number } {
  let early = 0, mid = 0, late = 0
  for (const h of heroes) {
    const t = HERO_TIMINGS[h.heroId] || { early: 5, mid: 5, late: 5 }
    early += t.early; mid += t.mid; late += t.late
  }
  return { early, mid, late, total: late - early }
}

function evaluateDraft(heroes: DraftHero[]): number {
  let score = 5
  const stunHeroes = [7, 2, 14, 28, 29, 96, 97, 129, 104, 51, 19, 38, 33, 100]
  if (heroes.some(h => stunHeroes.includes(h.heroId))) score += 1
  const saveHeroes = [79, 50, 83, 102, 111, 112, 57, 91]
  if (heroes.some(h => saveHeroes.includes(h.heroId))) score += 1
  const waveClearHeroes = [25, 35, 48, 6, 34, 11, 64, 74, 22, 52]
  if (heroes.some(h => waveClearHeroes.includes(h.heroId))) score += 1
  const initHeroes = [2, 33, 129, 97, 96, 51, 13, 120, 38, 7, 29]
  if (heroes.some(h => initHeroes.includes(h.heroId))) score += 1
  const pushHeroes = [109, 48, 80, 43, 53, 61, 77, 27]
  if (heroes.some(h => pushHeroes.includes(h.heroId))) score += 1
  const avgComfort = heroes.reduce((s, h) => s + h.comfortScore, 0) / Math.max(heroes.length, 1)
  if (avgComfort > 0.6) score += 1
  if (avgComfort > 0.7) score += 1
  return Math.min(10, Math.max(1, score))
}

function getTeamIdentity(timing: { total: number }): string {
  const t = timing.total
  if (t > 12) return 'đội hình late-game scaling 🐢'
  if (t > 5) return 'đội hình thiên late-mid game 📈'
  if (t > -3) return 'đội hình cân bằng ⚖️'
  if (t < -8) return 'đội hình hyper-aggressive early game 🚀'
  if (t < -3) return 'đội hình thiên early-mid game ⚡'
  return 'đội hình linh hoạt 🎯'
}

export function generateCommentary(input: CommentaryInput): CommentaryOutput {
  const { radiantTeam, direTeam, radiantHeroes, direHeroes, prediction } = input
  const radiantTiming = getTeamTiming(radiantHeroes)
  const direTiming = getTeamTiming(direHeroes)
  const radiantDraftScore = evaluateDraft(radiantHeroes)
  const direDraftScore = evaluateDraft(direHeroes)

  const draftAnalysis: string[] = []
  const radiantIdentity = getTeamIdentity(radiantTiming)
  const direIdentity = getTeamIdentity(direTiming)
  
  draftAnalysis.push(`🟢 **${radiantTeam}** chọn ${radiantIdentity}.`)
  draftAnalysis.push(`🔴 **${direTeam}** đáp trả với ${direIdentity}.`)

  if (radiantDraftScore > 7) draftAnalysis.push(`📗 Draft của ${radiantTeam} đạt ${radiantDraftScore}/10 — synergy xuất sắc, kế hoạch rõ ràng.`)
  else if (radiantDraftScore > 5) draftAnalysis.push(`📘 Draft của ${radiantTeam} đạt ${radiantDraftScore}/10 — ổn nhưng có điểm yếu có thể khai thác.`)
  else draftAnalysis.push(`📕 Draft của ${radiantTeam} đạt ${radiantDraftScore}/10 — synergy đáng ngờ, cần outplay.`)

  if (direDraftScore > 7) draftAnalysis.push(`📗 Draft của ${direTeam} đạt ${direDraftScore}/10 — synergy xuất sắc, kế hoạch rõ ràng.`)
  else if (direDraftScore > 5) draftAnalysis.push(`📘 Draft của ${direTeam} đạt ${direDraftScore}/10 — ổn nhưng có điểm yếu có thể khai thác.`)
  else draftAnalysis.push(`📕 Draft của ${direTeam} đạt ${direDraftScore}/10 — synergy đáng ngờ, cần outplay.`)

  const timingDiff = radiantTiming.total - direTiming.total
  if (Math.abs(timingDiff) > 5) {
    if (timingDiff > 0) {
      draftAnalysis.push(`⏰ ${radiantTeam} mạnh hơn về late-game (+${timingDiff.toFixed(0)} điểm). ${direTeam} PHẢI kết thúc sớm.`)
    } else {
      draftAnalysis.push(`⏰ ${direTeam} mạnh hơn về late-game (+${Math.abs(timingDiff).toFixed(0)} điểm). ${radiantTeam} PHẢI kết thúc sớm.`)
    }
  } else {
    draftAnalysis.push(`⚖️ Cả hai đội có timing window tương đương — trận này sẽ quyết định bởi kỹ năng và execution.`)
  }

  const winConditions = {
    radiant: generateWinConditions(radiantHeroes, radiantTiming, radiantTeam),
    dire: generateWinConditions(direHeroes, direTiming, direTeam),
  }

  const keyMatchups = generateMatchups(radiantHeroes, direHeroes)
  const powerSpikes = generatePowerSpikes(radiantHeroes, direHeroes)

  const favored = prediction.radiantWinProb > prediction.direWinProb ? radiantTeam : direTeam
  const favoredProb = Math.max(prediction.radiantWinProb, prediction.direWinProb) * 100
  let predictionText = ''
  if (Math.abs(prediction.radiantWinProb - prediction.direWinProb) < 0.05) {
    predictionText = `⚖️ Quá cân bằng để dự đoán — cả hai đội đều có điều kiện thắng rõ ràng. Đây là trận 50/50 thực sự.`
  } else if (favoredProb > 65) {
    predictionText = `🔥 **${favored}** được đánh giá cao hơn hẳn với ${favoredProb.toFixed(0)}% tỉ lệ thắng. Draft cho thấy ưu thế rõ rệt.`
  } else {
    predictionText = `📊 Lợi thế nhẹ nghiêng về **${favored}** với ${favoredProb.toFixed(0)}% tỉ lệ thắng — nhưng trận này ai cũng có cửa.`
  }

  let overall = ''
  if (input.seriesScore) {
    overall = `🎮 Tỉ số series: ${input.seriesScore}. ${generateSeriesContext(input.seriesScore, radiantTeam, direTeam)}`
  } else {
    overall = `🎮 Trận ${input.format} này là cuộc đối đầu giữa ${radiantIdentity.toLowerCase()} vs ${direIdentity.toLowerCase()}. ${predictionText}`
  }

  return { title: `${radiantTeam} vs ${direTeam} — Phân Tích Draft`, draftAnalysis, winConditions, keyMatchups, powerSpikes, prediction: predictionText, overall }
}

function generateWinConditions(heroes: DraftHero[], timing: any, team: string): string[] {
  const conditions: string[] = []
  if (timing.total > 8) {
    conditions.push(`🐢 **Kéo Dài Trận Đấu**: Đưa game qua phút 35. Core của bạn outscale đối thủ.`)
    conditions.push(`🛡️ **Bảo Vệ Carry**: Stack camp, ward phòng thủ, chỉ đánh khi có lợi thế.`)
  } else if (timing.total < -5) {
    conditions.push(`⚡ **Deathball Sớm**: Hạ T1 trước phút 15, Roshan trước 20. Đừng cho đối thủ thở.`)
    conditions.push(`🏃 **Áp Lực Liên Tục**: Group 5 người sau phút 10. Ép combat ở objective.`)
  } else {
    conditions.push(`⚖️ **Tấn Công Có Kiểm Soát**: Đánh nhau quanh power spike (BKB, ultimate quan trọng).`)
    conditions.push(`🎯 **Chơi Theo Mục Tiêu**: Kiểm soát map, force rotation, lấy trụ từng bước.`)
  }

  const carry = heroes.find(h => h.position === 0)
  if (carry) conditions.push(`⭐ **${carry.heroName}** (Carry) cần farm tốt — hero này quyết định late game của ${team}.`)
  const mid = heroes.find(h => h.position === 1)
  if (mid) conditions.push(`🎮 **${mid.heroName}** (Mid) phải kiểm soát tempo. Gank sớm và thường xuyên.`)

  return conditions
}

function generateMatchups(radiant: DraftHero[], dire: DraftHero[]): string[] {
  const matchups: string[] = []
  const rMid = radiant.find(h => h.position === 1)
  const dMid = dire.find(h => h.position === 1)
  if (rMid && dMid) {
    const rMidName = rMid.heroName || 'Unknown'
    const dMidName = dMid.heroName || 'Unknown'
    matchups.push(`🎯 **Mid Lane**: ${rMidName} vs ${dMidName} — Kèo cân não, ai được gank trước sẽ thắng lane.`)
  }
  const rCarry = radiant.find(h => h.position === 0)
  const dCarry = dire.find(h => h.position === 0)
  if (rCarry && dCarry) {
    const rT = (HERO_TIMINGS[rCarry.heroId] || { late: 5 }).late
    const dT = (HERO_TIMINGS[dCarry.heroId] || { late: 5 }).late
    const rName = rCarry.heroName || 'Unknown'
    const dName = dCarry.heroName || 'Unknown'
    if (rT > dT + 2) matchups.push(`⭐ ${rName} outscale ${dName} về late game — ${dName} cần kết thúc sớm.`)
    else if (dT > rT + 2) matchups.push(`⭐ ${dName} outscale ${rName} về late game — ${rName} cần kết thúc sớm.`)
    else matchups.push(`⚖️ ${rName} vs ${dName} scaling tương đương — late game 50/50.`)
  }
  return matchups
}

function generatePowerSpikes(radiant: DraftHero[], dire: DraftHero[]): string[] {
  const spikes: string[] = []
  const all = [...radiant.map(h => ({ ...h, team: 'Radiant' })), ...dire.map(h => ({ ...h, team: 'Dire' }))]
  const spikeHeroes = all
    .filter(h => { const t = HERO_TIMINGS[h.heroId]; return t && (t.mid >= 8 || t.late >= 8) })
    .sort((a, b) => { const ta = HERO_TIMINGS[a.heroId]||{mid:5}; const tb = HERO_TIMINGS[b.heroId]||{mid:5}; return tb.mid-ta.mid })

  for (const h of spikeHeroes.slice(0, 3)) {
    const t = HERO_TIMINGS[h.heroId]
    const timing = t?.mid >= 8 ? 'sức mạnh đột biến' : 'cửa sổ timing'
    spikes.push(`⚡ **${h.heroName}** (${h.team}) đạt ${timing} lớn ở mid-game. Phải tôn trọng.`)
  }

  if (radiant.some(h => [19, 18, 42, 81, 96].includes(h.heroId)))
    spikes.push(`🛡️ Core Radiant cần BKB sớm — Dire phải ép combat trước timing BKB.`)
  if (dire.some(h => [19, 18, 42, 81, 96].includes(h.heroId)))
    spikes.push(`🛡️ Core Dire cần BKB sớm — Radiant phải ép combat trước timing BKB.`)

  return spikes
}

function generateSeriesContext(score: string, radiant: string, dire: string): string {
  if (score === '1-1') return `Game 3 — winner takes all! Cả hai đội đã lộ bài, giờ là lúc bản lĩnh lên tiếng.`
  if (score === '2-0' || score === '0-2') return `Match point — đội thua cần 1 phép màu để lật kèo.`
  return `Draft sẽ quyết định trận đấu này.`
}
