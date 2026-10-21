import { createHash } from 'node:crypto'

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    )
  return value
}
export const fingerprint = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
export function invariant(condition, code = 'invalid_input') {
  if (!condition) throw new Error(code)
}
export function safe(value) {
  const text = JSON.stringify(value)
  invariant(text.length < 4_000_000, 'payload_limit')
  invariant(
    !/(?:Bearer\s+[\w.-]+|gh[pousr]_[\w]+|github_pat_[\w]+|postgres(?:ql)?:\/\/|sk-[A-Za-z0-9]{16,}|(?:password|secret|access_token|api_key)\s*[=:]\s*["']?[^\s"'<>]{6,})/i.test(
      text,
    ),
    'sensitive_payload',
  )
  return value
}
export function errorCode(error) {
  const codes = [
    'invalid_mode',
    'invalid_argument',
    'state_outside_private_root',
    'symlink_refused',
    'sync_locked',
    'lock_owner_alive',
    'provider_failure',
    'tool_unavailable',
    'query_unavailable',
    'invalid_notion_url',
    'missing_page_content',
    'incomplete_page',
    'schema_drift',
    'relation_drift',
    'options_drift',
    'project_scope',
    'central_scope',
    'missing_section',
    'section_ancestry',
    'foreign_project_record',
    'bridge_timeout',
    'response_mismatch',
    'call_limit',
    'payload_limit',
    'sensitive_payload',
    'pagination_limit',
    'duplicate_notion_page',
    'invalid_marker',
    'invalid_plan',
    'plan_tampered',
    'missing_apply_contract',
    'authorization_digest',
    'plan_expired',
    'source_changed',
    'unknown_identity',
    'checkpoint_invalid',
  ]
  return codes.includes(error?.message) ? error.message : 'sync_failed'
}
export function notionUrl(value) {
  const text = String(value)
    .replace(/\?[^]*$/, '')
    .replace(/^(https:\/\/app\.notion\.com)\/([a-f0-9]{32})$/, '$1/p/$2')
  invariant(
    /^https:\/\/(?:app\.)?notion\.com\/p\/[a-f0-9]{32}$/.test(text),
    'invalid_notion_url',
  )
  return text
}
export function stableId(kind, id, repository) {
  invariant(
    [
      'pr',
      'issue',
      'commit',
      'evidence',
      'execution',
      'project',
      'decision',
      'risk',
    ].includes(kind),
  )
  invariant(repository === 'naiguelcabral/seus-brownies', 'repository_scope')
  invariant(/^[a-zA-Z0-9:._-]{1,160}$/.test(String(id)))
  return `github:${repository}:${kind}:${id}`
}
export function observation(kind, raw, repository) {
  let evidence
  if (kind === 'commit') {
    invariant(/^[a-f0-9]{40}$/.test(raw.sha), 'missing_sha')
    evidence = {
      kind,
      sha: raw.sha,
      url: `https://github.com/${repository}/commit/${raw.sha}`,
      state: 'present-on-main',
      implemented: 'not-inferred',
      hml: 'unproven',
      production: 'unproven',
    }
  } else {
    invariant(
      Number.isSafeInteger(raw.number) && raw.number > 0,
      'missing_number',
    )
    invariant(['open', 'closed'].includes(raw.state), 'missing_state')
    if (kind === 'pr')
      invariant(
        typeof raw.draft === 'boolean' && /^[a-f0-9]{40}$/.test(raw.head?.sha),
        'missing_pr_evidence',
      )
    evidence = {
      kind,
      number: raw.number,
      url: `https://github.com/${repository}/${kind === 'pr' ? 'pull' : 'issues'}/${raw.number}`,
      state: raw.merged_at ? 'merged' : raw.state,
      ...(kind === 'pr'
        ? {
            draft: raw.draft,
            head: raw.head.sha,
            merge: raw.merge_commit_sha ?? null,
          }
        : {}),
      hml: 'unproven',
      production: 'unproven',
    }
  }
  return {
    key: stableId(kind, kind === 'commit' ? raw.sha : raw.number, repository),
    evidence,
    fingerprint: fingerprint(evidence),
    legacy:
      kind === 'pr'
        ? `GH-PR-${raw.number}`
        : kind === 'issue'
          ? `GH-ISSUE-${raw.number}`
          : null,
  }
}
export function page(raw) {
  invariant(!raw.truncated && !raw.unknown_block_count, 'incomplete_page')
  const properties = raw.text?.match(
    /<properties>\n([\s\S]*?)\n<\/properties>/,
  )?.[1]
  const content = raw.text?.match(/<content>\n([\s\S]*?)\n<\/content>/)?.[1]
  invariant(properties && content !== undefined, 'missing_page_content')
  const markers = [
    ...content.matchAll(/CACAU_SYNC_V1 ([a-f0-9]{64}) ([A-Za-z0-9+/=]+)/g),
  ].map((m) => {
    const metadata = JSON.parse(Buffer.from(m[2], 'base64').toString())
    invariant(fingerprint(metadata) === m[1], 'invalid_marker')
    safe(metadata)
    invariant(
      metadata.version === 1 &&
        metadata.key?.startsWith('github:naiguelcabral/seus-brownies:') &&
        metadata.fingerprint === fingerprint(metadata.evidence),
      'invalid_marker',
    )
    return metadata
  })
  invariant(new Set(markers.map((m) => m.key)).size <= 1, 'conflicting_markers')
  return {
    url: notionUrl(raw.url),
    properties: JSON.parse(properties),
    content,
    marker: markers.at(-1) ?? null,
    version: fingerprint({ properties: JSON.parse(properties), content }),
  }
}
export function block(item, observedAt) {
  const metadata = {
    key: item.key,
    fingerprint: item.fingerprint,
    evidence: item.evidence,
    observedAt,
    syncedAt: new Date().toISOString(),
    version: 1,
  }
  safe(metadata)
  return `## Observação técnica supervisionada\nOrigem: ${item.evidence.url}\nEstado verificado: ${item.evidence.state}. HML e produção: não comprovados. Não altera conclusão de requisito.\nObservado UTC: ${observedAt}\n\`CACAU_SYNC_V1 ${fingerprint(metadata)} ${Buffer.from(JSON.stringify(metadata)).toString('base64')}\``
}
export function summarize(rows) {
  return {
    total: rows.length,
    byStatus: rows.reduce((counts, row) => {
      const status = row.Status || 'Sem status'
      counts[status] = (counts[status] || 0) + 1
      return counts
    }, {}),
  }
}
