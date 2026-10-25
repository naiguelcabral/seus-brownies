/**
 * Response headers for pages that may carry a reset token in the URL: never
 * cache the response and never leak the URL through the Referer header.
 */
export const sensitiveAuthPageHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
} as const
