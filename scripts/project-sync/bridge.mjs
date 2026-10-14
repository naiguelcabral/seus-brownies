import { setTimeout as delay } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { invariant } from './model.mjs'

const reads = ['github.fetch', 'notion.fetch', 'notion.query', 'notion.access']
export const toolNames = Object.freeze({
  'github.fetch': 'mcp__codex_apps__github_fetch',
  'notion.fetch': 'mcp__notion__notion_fetch',
  'notion.query': 'mcp__notion__notion_query_data_sources',
  'notion.access': 'mcp__notion__notion_get_tool_access',
  'notion.create': 'mcp__notion__notion_create_pages',
  'notion.append': 'mcp__notion__notion_update_page',
})
export class Exchange {
  constructor(state, { write = false, timeout = 120000, maxCalls = 300 } = {}) {
    invariant(timeout > 0 && timeout <= 180000 && maxCalls <= 300)
    this.state = state
    this.write = write
    this.timeout = timeout
    this.maxCalls = maxCalls
    this.calls = 0
  }
  async call(method, args) {
    invariant(
      toolNames[method] && (reads.includes(method) || this.write),
      'write_forbidden',
    )
    invariant(++this.calls <= this.maxCalls, 'call_limit')
    const request = { id: randomUUID(), method, tool: toolNames[method], args }
    await this.state.remove('response.json')
    await this.state.write('request.json', request)
    const deadline = Date.now() + this.timeout
    while (Date.now() < deadline) {
      const response = await this.state.read('response.json')
      if (response) {
        invariant(response.id === request.id, 'response_mismatch')
        await this.state.remove('response.json')
        await this.state.remove('request.json')
        if (response.error)
          throw Object.assign(new Error('provider_failure'), {
            status: response.status,
          })
        return response.result
      }
      await delay(50)
    }
    throw new Error('bridge_timeout')
  }
}
export function unpack(result) {
  if (result?.structuredContent?.error) throw new Error('provider_failure')
  const text =
    result?.structuredContent?.content ??
    result?.content?.find((c) => c.type === 'text')?.text
  const value = typeof text === 'string' ? JSON.parse(text) : result
  if (result?.isError || value?.code || value?.name === 'APIResponseError')
    throw Object.assign(new Error('provider_failure'), { status: value.status })
  return value
}
export async function retryRead(fn, sleep = delay) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === 2 || ![429, 502, 503, 504].includes(error.status))
        throw new Error('provider_failure')
      await sleep(Math.min(200 * 2 ** attempt, 1000))
    }
  }
  throw new Error('provider_failure')
}
