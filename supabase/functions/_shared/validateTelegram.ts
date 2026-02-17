export interface ValidationResult {
  valid: boolean
  telegram_id: number | null
}

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 * Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secret_key = HMAC-SHA256(key="WebAppData", data=botToken)
 * hash       = HMAC-SHA256(key=secret_key, data=data_check_string)
 */
export async function validateInitData(
  initData: string,
  botToken: string
): Promise<ValidationResult> {
  try {
    if (!initData) return { valid: false, telegram_id: null }

    const params = new URLSearchParams(initData)
    const hash = params.get("hash")

    if (!hash) return { valid: false, telegram_id: null }

    // Build data_check_string: all params except hash, sorted alphabetically
    const entries: string[] = []
    params.forEach((value, key) => {
      if (key !== "hash") entries.push(`${key}=${value}`)
    })
    entries.sort()
    const dataCheckString = entries.join("\n")

    const encoder = new TextEncoder()

    // Step 1: secret_key = HMAC-SHA256(key="WebAppData", data=botToken)
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const secretKeyBuffer = await crypto.subtle.sign(
      "HMAC",
      webAppDataKey,
      encoder.encode(botToken)
    )

    // Step 2: hash = HMAC-SHA256(key=secret_key, data=data_check_string)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(dataCheckString)
    )

    // Step 3: compare hex hashes
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    if (computedHash !== hash) return { valid: false, telegram_id: null }

    // Extract telegram_id from user param (JSON string)
    const userParam = params.get("user")
    if (!userParam) return { valid: true, telegram_id: null }

    const user = JSON.parse(userParam)
    return { valid: true, telegram_id: user.id ?? null }
  } catch {
    return { valid: false, telegram_id: null }
  }
}
