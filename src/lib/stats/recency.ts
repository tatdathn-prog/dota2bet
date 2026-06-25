/**
 * Recency-weighted statistics
 * 
 * Recent matches get exponentially more weight than older ones.
 * This captures meta shifts, team form, and patch changes.
 * 
 * Weight = e^(-decayRate * daysAgo)
 * Half-life = ln(2) / decayRate
 */

const DEFAULT_HALF_LIFE_DAYS = 14 // Matches lose 50% weight after 14 days

function getDecayRate(halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS): number {
  return Math.log(2) / halfLifeDays
}

export function recencyWeight(matchDate: Date, halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS): number {
  const now = new Date()
  const daysAgo = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24)
  const decayRate = getDecayRate(halfLifeDays)
  return Math.exp(-decayRate * Math.max(0, daysAgo))
}

export interface WeightedStats {
  weightedWins: number
  weightedGames: number
  totalWeight: number
}

/**
 * Calculate weighted win/loss from a list of matches with dates and results
 */
export function weightedWinrate(
  matches: Array<{ date: Date; isWin: boolean }>,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS
): WeightedStats & { weightedWR: number } {
  let weightedWins = 0
  let weightedGames = 0
  let totalWeight = 0

  for (const m of matches) {
    const weight = recencyWeight(m.date, halfLifeDays)
    weightedGames += weight
    totalWeight += weight
    if (m.isWin) weightedWins += weight
  }

  return {
    weightedWins,
    weightedGames,
    totalWeight,
    weightedWR: weightedGames > 0 ? weightedWins / weightedGames : 0,
  }
}

/**
 * Combine Bayesian shrinkage with recency weighting
 * First weight matches by recency, then shrink the result
 */
export function smartWinrate(
  matches: Array<{ date: Date; isWin: boolean }>,
  priorStrength: number = 10,
  priorMean: number = 0.50,
  halfLifeDays: number = 14
): { shrunkWR: number; rawWeightedWR: number; confidence: number; effectiveGames: number } {
  const weighted = weightedWinrate(matches, halfLifeDays)

  // Effective sample size for Bayesian shrinkage
  // Sum of weights capped to not overstate confidence
  const effectiveGames = Math.min(weighted.weightedGames, matches.length)

  // Apply Bayesian shrinkage to the weighted result
  const priorAlpha = priorMean * priorStrength
  const priorBeta = (1 - priorMean) * priorStrength
  const posteriorAlpha = priorAlpha + weighted.weightedWins
  const posteriorBeta = priorBeta + (weighted.weightedGames - weighted.weightedWins)

  const shrunkWR = posteriorAlpha / (posteriorAlpha + posteriorBeta)
  const confidence = effectiveGames / (priorStrength + effectiveGames)

  return {
    shrunkWR,
    rawWeightedWR: weighted.weightedWR,
    confidence,
    effectiveGames,
  }
}
