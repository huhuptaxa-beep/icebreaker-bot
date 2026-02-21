import { STRATEGY_CONFIG } from "./config.ts"

export function calculateFreshness(lastTimestamp: Date, currentTimestamp: Date) {
  if (!lastTimestamp) return 1

  const diffHours =
    (currentTimestamp.getTime() - new Date(lastTimestamp).getTime()) /
    (1000 * 60 * 60)

  for (const tier of STRATEGY_CONFIG.freshness.tiers) {
    if (diffHours < tier.hours) {
      return tier.multiplier
    }
  }

  return STRATEGY_CONFIG.freshness.defaultMultiplier
}