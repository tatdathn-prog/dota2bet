/**
 * Role Inference Engine
 * 
 * Infers which position (1-5) a hero is being played based on:
 * 1. Farm priority from match data (CS, GPM patterns)
 * 2. Team slot position (slot 1 = safelane, 2 = mid, 3 = offlane, 4/5 = support)
 * 3. Historical role data from hero stats
 * 
 * Since OpenDota live/pro data includes team_slot, we can directly
 * infer position from the slot mapping:
 *   - Slot 0-4 on radiant = pos 1-5
 *   - Slot 0-4 on dire = pos 1-5 (but lanes swapped)
 */

export const POSITION_NAMES: Record<number, string> = {
  0: 'carry',      // Position 1 - Safe Lane Carry
  1: 'mid',        // Position 2 - Mid Lane
  2: 'offlane',    // Position 3 - Off Lane
  3: 'soft_support', // Position 4 - Roaming Support
  4: 'hard_support', // Position 5 - Hard Support
}

/**
 * Map team_slot to position for both radiant and dire
 */
export function teamSlotToPosition(slot: number, team: 'radiant' | 'dire'): string {
  // In Dota 2:
  // Radiant: slot 0=pos1, 1=pos2, 2=pos3, 3=pos4, 4=pos5
  // Dire: slot 0=pos1, 1=pos2, 2=pos3, 3=pos4, 4=pos5
  // The slot numbering is consistent regardless of side
  return POSITION_NAMES[slot] || 'unknown'
}

/**
 * Simplified position categories
 */
export function positionToRole(position: string): 'carry' | 'mid' | 'offlane' | 'support' {
  if (position === 'carry') return 'carry'
  if (position === 'mid') return 'mid'
  if (position === 'offlane') return 'offlane'
  return 'support'
}

/**
 * Get role distribution for a hero based on historical picks
 */
export interface RoleDistribution {
  heroId: number
  heroName: string
  roles: Record<string, { picks: number; wins: number; wr: number }>
  primaryRole: string
  secondaryRole: string
  flexibility: number // 0-1, higher = played in many roles
}

export function calculateRoleDistribution(
  picks: Array<{ heroId: number; position: string; isWin: boolean }>
): Map<number, RoleDistribution> {
  const heroRoles = new Map<number, Map<string, { picks: number; wins: number }>>()

  for (const pick of picks) {
    if (!heroRoles.has(pick.heroId)) {
      heroRoles.set(pick.heroId, new Map())
    }
    const roles = heroRoles.get(pick.heroId)!
    const entry = roles.get(pick.position) || { picks: 0, wins: 0 }
    entry.picks++
    if (pick.isWin) entry.wins++
    roles.set(pick.position, entry)
  }

  const result = new Map<number, RoleDistribution>()
  for (const [heroId, roles] of heroRoles) {
    const roleEntries: Record<string, { picks: number; wins: number; wr: number }> = {}
    let totalPicks = 0

    for (const [role, data] of roles) {
      roleEntries[role] = { ...data, wr: data.picks > 0 ? data.wins / data.picks : 0 }
      totalPicks += data.picks
    }

    // Sort by picks descending
    const sorted = Object.entries(roleEntries).sort((a, b) => b[1].picks - a[1].picks)
    const primaryRole = sorted[0]?.[0] || 'unknown'
    const secondaryRole = sorted[1]?.[0] || primaryRole

    // Flexibility = 1 - (primary_picks / total_picks)
    // Higher = hero played across many roles
    const flexibility = totalPicks > 0
      ? 1 - (sorted[0]?.[1]?.picks || 0) / totalPicks
      : 0

    result.set(heroId, {
      heroId,
      heroName: '', // filled by caller
      roles: roleEntries,
      primaryRole,
      secondaryRole,
      flexibility,
    })
  }

  return result
}
