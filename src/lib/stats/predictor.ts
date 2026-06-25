/**
 * Multi-Layer Prediction Engine
 * 
 * Predicts match outcomes using weighted combination:
 * - Team Strength (35%): Bayesian team win rates
 * - Hero Comfort (40%): How well each team plays their drafted heroes
 * - Synergy/Counter (25%): How well the team's heroes work together and counter opponents
 */

import { bayesianWinrate } from './bayesian'
import { recencyWeight } from './recency'

export interface TeamMetrics {
  teamId: number
  teamName: string
  matches: number
  wins: number
  shrunkWR: number
  confidence: number
  recentWR: number
}

export interface HeroComfort {
  heroId: number
  heroName: string
  teamPicks: number
  teamWins: number
  comfortScore: number // 0-1, how comfortable team is on this hero
}

export interface PredictionInput {
  radiantTeam: TeamMetrics
  direTeam: TeamMetrics
  radiantHeroes: HeroComfort[]
  direHeroes: HeroComfort[]
  radiantCombos: Array<{ hero1: number; hero2: number; wr: number; games: number }>
  direCombos: Array<{ hero1: number; hero2: number; wr: number; games: number }>
}

export interface PredictionResult {
  radiantWinProb: number
  direWinProb: number
  confidence: number // Overall confidence in prediction
  breakdown: {
    teamStrength: { radiant: number; dire: number; weight: number }
    heroComfort: { radiant: number; dire: number; weight: number }
    synergyCounter: { radiant: number; dire: number; weight: number }
  }
  keyFactors: string[]
}

const WEIGHTS = {
  TEAM_STRENGTH: 0.35,
  HERO_COMFORT: 0.40,
  SYNERGY_COUNTER: 0.25,
}

/**
 * Team Strength Score
 * Uses Bayesian winrate compared to opponent
 */
function computeTeamStrength(radiant: TeamMetrics, dire: TeamMetrics): { radiant: number; dire: number } {
  // Log-odds transformation for comparison
  const toLogOdds = (wr: number) => Math.log(Math.max(wr, 0.01) / Math.max(1 - wr, 0.01))

  const radiantLog = toLogOdds(radiant.shrunkWR)
  const direLog = toLogOdds(dire.shrunkWR)

  // Convert log-odds difference to probability
  const diff = radiantLog - direLog
  const radiantProb = 1 / (1 + Math.exp(-diff))

  return { radiant: radiantProb, dire: 1 - radiantProb }
}

/**
 * Hero Comfort Score
 * How comfortable each team is on their drafted heroes
 * Weighted by hero pick rate and recency
 */
function computeHeroComfort(
  radiantHeroes: HeroComfort[],
  direHeroes: HeroComfort[]
): { radiant: number; dire: number } {
  const score = (heroes: HeroComfort[]): number => {
    if (heroes.length === 0) return 0.5 // No data → neutral

    let totalScore = 0
    let totalWeight = 0

    for (const h of heroes) {
      // Comfort = weighted combination of:
      // - Win rate on hero (60%)
      // - Pick volume / confidence (40%)
      const wrScore = h.comfortScore > 0 ? h.comfortScore : 0.5
      const expScore = Math.min(h.teamPicks / 20, 1.0) // Caps at 20 games

      const heroScore = wrScore * 0.6 + expScore * 0.4
      totalScore += heroScore
      totalWeight += 1
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5
  }

  const radiantScore = score(radiantHeroes)
  const direScore = score(direHeroes)

  // Relative probability
  const total = radiantScore + direScore
  if (total === 0) return { radiant: 0.5, dire: 0.5 }

  return {
    radiant: radiantScore / total,
    dire: direScore / total,
  }
}

/**
 * Synergy & Counter Score
 * Combos within team + counter matchups vs opponent
 */
function computeSynergyCounter(
  radiantCombos: Array<{ hero1: number; hero2: number; wr: number; games: number }>,
  direCombos: Array<{ hero1: number; hero2: number; wr: number; games: number }>
): { radiant: number; dire: number } {
  const score = (combos: Array<{ wr: number; games: number }>): number => {
    if (combos.length === 0) return 0.5

    let totalScore = 0
    let totalWeight = 0

    for (const c of combos) {
      const weight = Math.min(c.games / 5, 1.0) // Confidence weight
      totalScore += c.wr * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5
  }

  const radiantScore = score(radiantCombos)
  const direScore = score(direCombos)

  const total = radiantScore + direScore
  if (total === 0) return { radiant: 0.5, dire: 0.5 }

  return {
    radiant: radiantScore / total,
    dire: direScore / total,
  }
}

/**
 * Main prediction function
 */
export function predictMatch(input: PredictionInput): PredictionResult {
  const team = computeTeamStrength(input.radiantTeam, input.direTeam)
  const hero = computeHeroComfort(input.radiantHeroes, input.direHeroes)
  const synergy = computeSynergyCounter(input.radiantCombos, input.direCombos)

  // Weighted combination
  const radiantProb =
    team.radiant * WEIGHTS.TEAM_STRENGTH +
    hero.radiant * WEIGHTS.HERO_COMFORT +
    synergy.radiant * WEIGHTS.SYNERGY_COUNTER

  const direProb = 1 - radiantProb

  // Overall confidence = weighted average of individual confidences
  const confidence =
    input.radiantTeam.confidence * WEIGHTS.TEAM_STRENGTH +
    (input.radiantHeroes.length > 0 ? 0.7 : 0.3) * WEIGHTS.HERO_COMFORT +
    (input.radiantCombos.length > 0 ? 0.7 : 0.3) * WEIGHTS.SYNERGY_COUNTER

  // Identify key factors
  const keyFactors: string[] = []

  if (team.radiant > 0.6) keyFactors.push(`🔥 ${input.radiantTeam.teamName} stronger team (${(team.radiant * 100).toFixed(0)}%)`)
  if (team.dire > 0.6) keyFactors.push(`🔥 ${input.direTeam.teamName} stronger team (${(team.dire * 100).toFixed(0)}%)`)

  if (hero.radiant > 0.6) keyFactors.push(`🦸 Radiant hero comfort advantage`)
  if (hero.dire > 0.6) keyFactors.push(`🦸 Dire hero comfort advantage`)

  if (synergy.radiant > 0.6) keyFactors.push(`🧩 Radiant synergy advantage`)
  if (synergy.dire > 0.6) keyFactors.push(`🧩 Dire synergy advantage`)

  return {
    radiantWinProb: radiantProb,
    direWinProb: direProb,
    confidence,
    breakdown: {
      teamStrength: { ...team, weight: WEIGHTS.TEAM_STRENGTH },
      heroComfort: { ...hero, weight: WEIGHTS.HERO_COMFORT },
      synergyCounter: { ...synergy, weight: WEIGHTS.SYNERGY_COUNTER },
    },
    keyFactors,
  }
}
