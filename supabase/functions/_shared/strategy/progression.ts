import { STRATEGY_CONFIG } from "./config.ts"

export type StrategySignalType =
  | "HIGH_INTEREST"
  | "LOW_INTEREST"
  | "SHIT_TEST"
  | "NEUTRAL"

type AvailableActionsInput = {
  effective_interest: number
  freshness_multiplier: number
  channel: string | null | undefined
  message_count_tinder: number
  message_count_tg: number
  telegram_invite_attempts: number
  date_invite_attempts: number
  signalType?: StrategySignalType
}

type NextObjectiveInput = {
  phase: number
  freshness_multiplier: number
  low_interest_streak: number
  signalType?: StrategySignalType
}

function normalizeChannel(channel: string | null | undefined): "app" | "telegram" {
  return channel === "telegram" ? "telegram" : "app"
}

export function derivePhaseLabel(
  effectiveInterest: number,
  channel: string | null | undefined
): {
  phase: number
  phaseLabel: "flirt" | "connection" | "telegram" | "tension" | "date_ready"
} {
  const safeInterest = Number.isFinite(effectiveInterest)
    ? effectiveInterest
    : STRATEGY_CONFIG.interest.defaultScore

  const safeChannel = normalizeChannel(channel)

  if (safeChannel === "telegram") {
    if (safeInterest >= 80) return { phase: 5, phaseLabel: "date_ready" }
    if (safeInterest >= 50) return { phase: 4, phaseLabel: "tension" }
    return { phase: 3, phaseLabel: "telegram" }
  }

  if (safeInterest >= 20) return { phase: 2, phaseLabel: "connection" }
  return { phase: 1, phaseLabel: "flirt" }
}

export function getAvailableActions(input: AvailableActionsInput): string[] {
  const actions: string[] = []
  const safeChannel = normalizeChannel(input.channel)
  const signalType = input.signalType ?? "NEUTRAL"

  if (input.freshness_multiplier < 0.6) {
    actions.push("reengage")
  }

  if (
    safeChannel === "telegram" &&
    input.message_count_tg === 0
  ) {
    actions.push("telegram_first")
  }

  const canEscalate =
    signalType !== "LOW_INTEREST" &&
    signalType !== "SHIT_TEST"

  if (
    canEscalate &&
    safeChannel === "app" &&
    input.effective_interest >= STRATEGY_CONFIG.interest.thresholds.telegram &&
    input.message_count_tinder >= STRATEGY_CONFIG.phase.minMessagesForTelegram &&
    input.telegram_invite_attempts < 3
  ) {
    actions.push("contact")
  }

  if (
    canEscalate &&
    safeChannel === "telegram" &&
    input.effective_interest >= STRATEGY_CONFIG.interest.thresholds.date &&
    input.message_count_tg >= STRATEGY_CONFIG.phase.minMessagesForDate &&
    input.date_invite_attempts < 3
  ) {
    actions.push("date")
  }

  return Array.from(new Set(actions))
}

export function deriveNextObjective(input: NextObjectiveInput): string {
  const signalType = input.signalType ?? "NEUTRAL"

  if (input.low_interest_streak >= 3) {
    return "END_CONVERSATION"
  }

  if (input.low_interest_streak >= 2 || signalType === "LOW_INTEREST") {
    return "SALVAGE"
  }

  if (input.freshness_multiplier < 0.6) {
    return "REWARM"
  }

  if (signalType === "SHIT_TEST") {
    return "PASS_TEST"
  }

  if (input.phase <= 1) {
    return "CONTINUE_PLAY"
  }

  if (input.phase === 2) {
    return "DEEPEN_CONNECTION"
  }

  if (input.phase === 3) {
    return "RESTART_PLAY"
  }

  if (input.phase === 4) {
    return "BUILD_TENSION"
  }

  return "DATE_READY"
}