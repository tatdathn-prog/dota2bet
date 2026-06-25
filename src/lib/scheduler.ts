// Auto-update scheduler - runs in the browser via API route
// In production, use a cron service. For local dev, we use a simple interval.

let updateInterval: ReturnType<typeof setInterval> | null = null

export function startScheduler() {
  if (updateInterval) return

  // Attempt update every 10 minutes
  updateInterval = setInterval(async () => {
    try {
      console.log('[Scheduler] Triggering update...')
      const res = await fetch('/api/update', { method: 'POST' })
      if (res.ok) {
        console.log('[Scheduler] Update successful')
      }
    } catch (e) {
      console.warn('[Scheduler] Update failed:', e)
    }
  }, 10 * 60 * 1000) // 10 min

  console.log('[Scheduler] Started (10min interval)')
}

export function stopScheduler() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}
