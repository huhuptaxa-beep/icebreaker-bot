import { STRATEGY_CONFIG } from "./config.ts"

export function updateStage(dialogue: any, effectiveInterest: number) {
  let stage = dialogue.stage ?? 1
  const { stage: stageConfig, interest } = STRATEGY_CONFIG

  if (
    dialogue.message_count_total >= stageConfig.minMessagesForPlay &&
    stage < 2
  ) {
    stage = 2
  }

  if (
    stage === 2 &&
    effectiveInterest >= interest.thresholds.telegram &&
    dialogue.telegram_status === false &&
    dialogue.message_count_total >= stageConfig.minMessagesForTelegram
  ) {
    stage = 3
  }

  if (dialogue.telegram_status === true && stage < 4) {
    stage = 4
  }

  if (dialogue.has_future_projection && stage < 5) {
    stage = 5
  }

  return stage
}