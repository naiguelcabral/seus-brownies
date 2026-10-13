import { config, schemaFingerprint } from './config.mjs'
import {
  fingerprint,
  invariant,
  block,
  page,
  summarize,
  safe,
  errorCode,
} from './model.mjs'

export function plan(snapshot, observedAt = new Date().toISOString()) {
  invariant(
    snapshot.github.repository === config.repository &&
      snapshot.notion.schemaVersion === schemaFingerprint(),
    'snapshot_scope',
  )
  const operations = snapshot.github.observations.map((item) => {
    const matches = snapshot.notion.records.filter(
      (r) =>
        r.marker?.key === item.key ||
        (item.legacy &&
          String(r.properties[config.fields.title]).split(' — ')[0] ===
            item.legacy),
    )
    if (matches.length > 1)
      return { kind: 'conflict', item, reason: 'duplicate_identity' }
    const record = matches[0]
    if (!record)
      return { kind: 'create', item, reason: 'verified_technical_observation' }
    if (!record.marker)
      return {
        kind: 'conflict',
        item,
        url: record.url,
        reason: 'manual_record_preserved',
      }
    return {
      kind:
        record.marker.fingerprint === item.fingerprint ? 'unchanged' : 'append',
      item,
      url: record.url,
      before: record.version,
      reason: 'incremental_evidence_only',
    }
  })
  const body = {
    version: 1,
    repository: config.repository,
    main: snapshot.github.main,
    observedAt,
    schemaVersion: snapshot.notion.schemaVersion,
    operations,
    ...(snapshot.notion.dashboard
      ? {
          dashboard: {
            url: snapshot.notion.dashboard.url,
            before: snapshot.notion.dashboard.version,
          },
        }
      : {}),
  }
  return safe({ ...body, digest: fingerprint(body) })
}
export function validatePlan(value) {
  const { digest, ...body } = value
  invariant(
    body.version === 1 &&
      body.repository === config.repository &&
      /^[a-f0-9]{40}$/.test(body.main) &&
      !Number.isNaN(Date.parse(body.observedAt)) &&
      body.schemaVersion === schemaFingerprint(),
    'invalid_plan',
  )
  invariant(
    fingerprint(body) === digest &&
      body.operations.length <= config.maxOperations,
    'plan_tampered',
  )
  invariant(
    new Set(body.operations.map((o) => o.item.key)).size ===
      body.operations.length,
    'duplicate_operation',
  )
  for (const op of body.operations) {
    invariant(
      ['create', 'append', 'unchanged', 'conflict'].includes(op.kind),
      'destructive_operation',
    )
    invariant(
      op.item.fingerprint === fingerprint(op.item.evidence),
      'invalid_evidence',
    )
    invariant(
      op.item.key.startsWith(`github:${config.repository}:`) &&
        op.item.evidence.hml === 'unproven' &&
        op.item.evidence.production === 'unproven',
      'evidence_scope',
    )
  }
  if (body.dashboard)
    invariant(
      body.dashboard.url === config.dashboard &&
        /^[a-f0-9]{64}$/.test(body.dashboard.before),
      'dashboard_scope',
    )
  return value
}
export async function apply(value, { github, notion, state, digest }) {
  validatePlan(value)
  invariant(value.digest === digest, 'authorization_digest')
  invariant(
    Date.now() - Date.parse(value.observedAt) >= 0 &&
      Date.now() - Date.parse(value.observedAt) <= 3600000,
    'plan_expired',
  )
  await notion.validateScope()
  await notion.access(true)
  const source = await github.collect()
  invariant(source.main === value.main, 'source_changed')
  const live = new Map(source.observations.map((o) => [o.key, o.fingerprint]))
  const journal = await state.read('checkpoint.json', { version: 1, plans: {} })
  invariant(
    journal.version === 1 && journal.plans && typeof journal.plans === 'object',
    'checkpoint_invalid',
  )
  const progress = (journal.plans[value.digest] ??= {})
  const results = []
  for (const op of value.operations) {
    if (['unchanged', 'conflict'].includes(op.kind)) {
      results.push({ key: op.item.key, result: op.kind })
      continue
    }
    try {
      invariant(live.get(op.item.key) === op.item.fingerprint, 'source_changed')
      const records = await notion.records()
      const matches = records.filter(
        (r) =>
          r.marker?.key === op.item.key ||
          (op.item.legacy &&
            String(r.properties[config.fields.title]).split(' — ')[0] ===
              op.item.legacy),
      )
      invariant(matches.length <= 1, 'duplicate_identity')
      let record = matches[0]
      const outstanding = Object.values(journal.plans).flatMap((entries) =>
        entries[op.item.key]?.status === 'intent' ? [entries[op.item.key]] : [],
      )
      // Recover an uncertain write by querying its durable marker, never blind retry.
      if (record?.marker?.fingerprint === op.item.fingerprint) {
        progress[op.item.key] = { status: 'verified', url: record.url }
        await state.write('checkpoint.json', journal)
        results.push({ key: op.item.key, result: 'recovered' })
        continue
      }
      invariant(
        outstanding.length === 0 &&
          (!progress[op.item.key] ||
            progress[op.item.key].status === 'verified'),
        'uncertain_write_requires_review',
      )
      if (op.kind === 'create') invariant(!record, 'concurrent_identity')
      else
        invariant(
          record?.url === op.url &&
            record.version === op.before &&
            record.marker?.key === op.item.key,
          'concurrent_edit',
        )
      const content = block(op.item, value.observedAt)
      progress[op.item.key] = {
        status: 'intent',
        fingerprint: op.item.fingerprint,
        operation: op.kind,
        ...(record ? { url: record.url } : {}),
      }
      await state.write('checkpoint.json', journal)
      const url =
        op.kind === 'create'
          ? await notion.create(op.item, content)
          : (await notion.append(record.url, content), record.url)
      record = page(await notion.fetch(url))
      invariant(
        record.marker?.key === op.item.key &&
          record.marker.fingerprint === op.item.fingerprint,
        'write_verification_failed',
      )
      invariant(
        record.properties[config.fields.project]?.includes(config.project),
        'relation_verification_failed',
      )
      if (op.kind === 'append')
        invariant(
          record.content.includes(matches[0].content) &&
            fingerprint(record.properties) ===
              fingerprint(matches[0].properties),
          'manual_content_changed',
        )
      progress[op.item.key] = { status: 'verified', url }
      await state.write('checkpoint.json', journal)
      results.push({ key: op.item.key, result: 'verified', url })
      await state.log({
        key: op.item.key,
        result: 'verified',
        operation: op.kind,
      })
    } catch (error) {
      const code = [
        'source_changed',
        'duplicate_identity',
        'uncertain_write_requires_review',
        'concurrent_identity',
        'concurrent_edit',
        'write_verification_failed',
        'relation_verification_failed',
        'manual_content_changed',
      ].includes(error.message)
        ? error.message
        : 'provider_failure'
      results.push({ key: op.item.key, result: 'blocked', code })
      await state.log({ key: op.item.key, result: code, operation: op.kind })
    }
  }
  if (value.dashboard) {
    const key = `dashboard:${value.digest}`
    try {
      invariant(value.dashboard.url === config.dashboard, 'dashboard_scope')
      const current = page(await notion.fetch(value.dashboard.url))
      if (current.content.includes(`CACAU_SYNC_DASHBOARD ${value.digest}`))
        results.push({ key, result: 'recovered' })
      else {
        invariant(current.version === value.dashboard.before, 'concurrent_edit')
        invariant(!progress[key], 'uncertain_write_requires_review')
        const report = dashboard({
          github: source,
          notion: {
            rows: {
              Tarefas: await notion.rows('Tarefas'),
              Decisões: await notion.rows('Decisões'),
              Riscos: await notion.rows('Riscos'),
            },
          },
        })
        const content = `## Snapshot supervisionado\nMain: ${source.main}\nPlano UTC: ${value.observedAt}\nSnapshot gerado UTC: ${new Date().toISOString()}\nTarefas: ${report.tasks.total}; distribuição: ${JSON.stringify(report.tasks.byStatus)}\nBloqueios críticos: ${report.criticalBlocks}. Riscos: ${report.risks.total}; distribuição: ${JSON.stringify(report.risks.byStatus)}\nPRs abertas: ${report.openPrs}. Decisões: ${report.decisions}.\nCI: ${JSON.stringify(report.ci)}\nPróximas tarefas prontas: ${report.next.join(', ') || 'não registradas'}\nHML, migrations e produção: não comprovados por merge/CI.\n\`CACAU_SYNC_DASHBOARD ${value.digest}\``
        progress[key] = { status: 'intent' }
        await state.write('checkpoint.json', journal)
        await notion.dashboard(content)
        const updated = page(await notion.fetch(value.dashboard.url))
        invariant(
          updated.content.includes(`CACAU_SYNC_DASHBOARD ${value.digest}`) &&
            updated.content.includes(current.content),
          'write_verification_failed',
        )
        progress[key] = { status: 'verified', url: value.dashboard.url }
        await state.write('checkpoint.json', journal)
        results.push({ key, result: 'verified' })
      }
    } catch (error) {
      const code = errorCode(error)
      results.push({ key, result: 'blocked', code })
      await state.log({ key, result: code, operation: 'append' })
    }
  }
  return {
    plan: value.digest,
    results,
    complete: !results.some(
      (r) => r.result === 'blocked' || r.result === 'conflict',
    ),
  }
}
export function dashboard(snapshot) {
  const related = (row) => {
    const value = row.Projeto
    const urls = typeof value === 'string' ? JSON.parse(value) : value
    return (
      Array.isArray(urls) &&
      urls.some(
        (url) =>
          String(url).replace('/p/', '/') ===
          config.project.replace('/p/', '/'),
      )
    )
  }
  const taskRows = snapshot.notion.rows.Tarefas.filter(related)
  const tasks = summarize(taskRows)
  const risk = summarize(snapshot.notion.rows.Riscos.filter(related))
  return {
    tasks,
    risks: risk,
    decisions: snapshot.notion.rows.Decisões.filter(related).length,
    criticalBlocks: taskRows.filter(
      (row) => row.Status === 'Bloqueada' && row.Prioridade === 'Crítica',
    ).length,
    next: taskRows
      .filter((row) => row.Status === 'Pronta')
      .map((row) => String(row.Título).split(' — ')[0]),
    openPrs: snapshot.github.openPrs,
    main: snapshot.github.main,
    ci: snapshot.github.ci,
  }
}
