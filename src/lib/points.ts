export const REPORT_POINTS = 10
export const REJECT_PENALTY = 10
export const MAX_REPORTS_PER_DAY = 15
export const MAX_ACTIVE_CLAIMS = 3
export const CLAIM_HOURS = 24

export function collectionPoints(weightKg: number) {
  return 20 + Math.min(Math.round(weightKg * 5), 80)
}
