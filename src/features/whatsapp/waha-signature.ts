/** Verify WAHA's HMAC over the exact received bytes; replay protection is separate. */
export async function verifyWahaSignature(input: {
  body: Uint8Array
  signature: string | null
  algorithm: string | null
  secret: string | undefined
}): Promise<boolean> {
  if (
    !input.secret ||
    input.algorithm !== 'sha512' ||
    !input.signature ||
    !/^[0-9a-f]{128}$/i.test(input.signature)
  )
    return false
  const signature = Uint8Array.from(
    input.signature.match(/.{2}/g) ?? [],
    (part) => Number.parseInt(part, 16),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    Uint8Array.from(input.body),
  )
}
