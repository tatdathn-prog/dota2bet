/**
 * Bayesian Shrinkage Estimator for win rates
 * 
 * Shrinks observed win rates toward the mean to avoid overfitting
 * on small sample sizes. A hero with 3-0 (100% WR) gets pulled down,
 * while a hero with 30-10 (75% WR) stays close to observed.
 * 
 * Using Beta-Binomial conjugate prior:
 * - Prior mean = league_avg_winrate (usually ~0.50)
 * - Prior strength = how many "virtual games" the prior is worth
 */

const DEFAULT_PRIOR_STRENGTH = 10 // Virtual games for prior
const DEFAULT_PRIOR_MEAN = 0.50   // League average winrate is 50%

export function bayesianWinrate(
  wins: number,
  games: number,
  priorStrength: number = DEFAULT_PRIOR_STRENGTH,
  priorMean: number = DEFAULT_PRIOR_MEAN
): { shrunkWR: number; confidence: number; alpha: number; beta: number } {
  const priorAlpha = priorMean * priorStrength
  const priorBeta = (1 - priorMean) * priorStrength

  const posteriorAlpha = priorAlpha + wins
  const posteriorBeta = priorBeta + (games - wins)
  const total = posteriorAlpha + posteriorBeta

  // Shrunk win rate = posterior mean
  const shrunkWR = posteriorAlpha / total

  // Confidence = 1 - (prior_strength / (prior_strength + games))
  // Higher confidence = more real data behind the estimate
  const confidence = games / (priorStrength + games)

  return {
    shrunkWR,
    confidence,
    alpha: posteriorAlpha,
    beta: posteriorBeta,
  }
}

/**
 * Calculate shrinkage amount
 * Returns how much the estimate was pulled toward the mean
 * 0 = fully observed, 1 = fully shrunk to prior
 */
export function shrinkageFactor(games: number, priorStrength: number = DEFAULT_PRIOR_STRENGTH): number {
  return priorStrength / (priorStrength + games)
}

/**
 * Beta distribution standard deviation for uncertainty
 */
export function winrateStdDev(alpha: number, beta: number): number {
  const total = alpha + beta
  return Math.sqrt((alpha * beta) / (total * total * (total + 1)))
}

/**
 * 95% credible interval for the win rate
 */
export function credibleInterval(alpha: number, beta: number): [number, number] {
  // Normal approximation for Beta distribution
  const mean = alpha / (alpha + beta)
  const sd = winrateStdDev(alpha, beta)
  return [
    Math.max(0, mean - 1.96 * sd),
    Math.min(1, mean + 1.96 * sd),
  ]
}
