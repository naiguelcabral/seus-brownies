import { config, schemaFingerprint } from './config.mjs'
import { unpack, retryRead } from './bridge.mjs'
import { invariant, observation, page, notionUrl, safe } from './model.mjs'

export class GitHubClient {
  constructor(transport) {
    this.transport = transport
  }
  async get(path) {
    invariant(
      /^\/(?:branches\/main|pulls\?|issues\?|actions\/runs\?)/.test(path),
      'github_path_scope',
    )
    return retryRead(async () =>
      unpack(
        await this.transport.call('github.fetch', {
          url: `https://api.github.com/repos/${config.repository}${path}`,
        }),
      ),
    )
  }
  async paginate(path, field) {
    const records = [],
      seen = new Set()
    for (let index = 1; index <= config.maxPages; index++) {
      const raw = await this.get(`${path}&per_page=100&page=${index}`),
        batch = field ? raw[field] : raw
      invariant(Array.isArray(batch), 'invalid_github_page')
      for (const item of batch) {
        invariant(!seen.has(item.id ?? item.number), 'duplicate_github_page')
        seen.add(item.id ?? item.number)
        records.push(item)
      }
      if (batch.length < 100) return records
    }
    throw new Error('pagination_limit')
  }
  async collect() {
    const main = await this.get('/branches/main')
    const prs = await this.paginate('/pulls?state=all')
    const issues = (await this.paginate('/issues?state=all')).filter(
      (i) => !i.pull_request,
    )
    const runs = await this.paginate(
      '/actions/runs?branch=main',
      'workflow_runs',
    )
    invariant(
      runs.every(
        (r) =>
          /^[a-f0-9]{40}$/.test(r.head_sha) &&
          [
            'completed',
            'queued',
            'in_progress',
            'waiting',
            'requested',
            'pending',
          ].includes(r.status),
      ),
      'missing_ci_evidence',
    )
    const ci = runs
      .filter(
        (r) =>
          r.head_sha === main.commit.sha &&
          r.head_branch === 'main' &&
          r.event === 'push',
      )
      .map((r) => ({
        id: r.id,
        sha: r.head_sha,
        status: r.status,
        conclusion: r.conclusion,
        url: `https://github.com/${config.repository}/actions/runs/${r.id}`,
      }))
    return safe({
      repository: config.repository,
      main: main.commit.sha,
      ci,
      openPrs: prs.filter((p) => p.state === 'open').length,
      observations: [
        observation('commit', main.commit, config.repository),
        ...prs.map((p) => observation('pr', p, config.repository)),
        ...issues.map((i) => observation('issue', i, config.repository)),
      ],
    })
  }
}
export class NotionClient {
  constructor(transport) {
    this.transport = transport
    this.sections = {}
    this.allowedPages = new Set()
  }
  async call(method, args) {
    return unpack(await this.transport.call(method, args))
  }
  async fetch(id) {
    return retryRead(() => this.call('notion.fetch', { id }))
  }
  async access(writes = false) {
    const names = [
      'fetch',
      'query_data_sources',
      ...(writes ? ['create_pages', 'update_page'] : []),
    ]
    const result = await this.call('notion.access', { tool_names: names })
    invariant(
      names.every(
        (name) =>
          ['available', 'available_with_limit'].includes(
            result.current_tool_access?.[name]?.status,
          ) ||
          (name === 'query_data_sources' &&
            result.current_tool_access?.[name]?.status === 'plan_required' &&
            config.views),
      ),
      'tool_unavailable',
    )
  }
  async validateScope() {
    await this.access()
    const root = await this.fetch(config.central)
    invariant(
      root.title === 'Central de Projetos' && !root.truncated,
      'central_scope',
    )
    this.sections = {}
    for (const match of root.text.matchAll(
      /<page url="([^"]+)">([^<]+)<\/page>/g,
    )) {
      if (config.sections.includes(match[2])) {
        invariant(!this.sections[match[2]], 'duplicate_section')
        this.sections[match[2]] = notionUrl(match[1])
      }
    }
    invariant(
      config.sections.every((name) => this.sections[name]),
      'missing_section',
    )
    for (const name of config.sections) {
      const section = await this.fetch(this.sections[name])
      invariant(
        section.text?.includes(config.central.replaceAll('-', '')) &&
          !section.truncated,
        'section_ancestry',
      )
      if (name === 'Dashboard Geral') this.dashboardPage = page(section)
      if (name === 'Dashboard Geral')
        this.allowedPages.add(notionUrl(this.sections[name]))
    }
    const expected = {
      Projetos: {
        Nome: 'title',
        Repositório: 'url',
        Tarefas: 'relation',
        Decisões: 'relation',
        Riscos: 'relation',
      },
      Tarefas: {
        [config.fields.title]: 'title',
        [config.fields.project]: 'relation',
        [config.fields.evidence]: 'text',
        [config.fields.status]: 'select',
      },
      Decisões: { Identificador: 'title', Projeto: 'relation' },
      Riscos: { Descrição: 'title', Projeto: 'relation' },
    }
    for (const [name, source] of Object.entries(config.sources)) {
      const fetched = await this.fetch(source)
      const raw = fetched.text?.match(
        /<data-source-state>\n([\s\S]*?)\n<\/data-source-state>/,
      )?.[1]
      invariant(raw, 'missing_schema')
      const schema = JSON.parse(raw).schema
      invariant(
        Object.entries(expected[name]).every(
          ([key, type]) => schema[key]?.type === type,
        ),
        'schema_drift',
      )
      if (name !== 'Projetos')
        invariant(
          schema.Projeto.dataSourceUrl === config.sources.Projetos,
          'relation_drift',
        )
      else
        for (const related of ['Tarefas', 'Decisões', 'Riscos'])
          invariant(
            schema[related].dataSourceUrl === config.sources[related],
            'relation_drift',
          )
      if (name === 'Tarefas')
        invariant(
          schema.Status.options.some((o) => o.name === 'A validar') &&
            schema.Fase?.options.some((o) => o.name === 'G3') &&
            schema.Prioridade?.options.some((o) => o.name === 'Não definida'),
          'options_drift',
        )
    }
    const project = page(await this.fetch(config.project))
    invariant(
      project.properties.Nome === 'Seus Brownies' &&
        project.properties.Repositório ===
          `https://github.com/${config.repository}`,
      'project_scope',
    )
    return this.sections
  }
  async rows(name) {
    invariant(config.sources[name], 'source_scope')
    const rows = [],
      urls = new Set()
    const viewUrl = config.views[name]
    invariant(viewUrl, 'missing_view')
    const view = await this.fetch(viewUrl)
    const definition = view.text?.match(
      /<view[^>]*>\n([\s\S]*?)\n<\/view>/,
    )?.[1]
    invariant(definition, 'invalid_view')
    const settings = JSON.parse(definition)
    invariant(
      settings.dataSourceUrl?.replace(/[{}]/g, '') === config.sources[name] &&
        !settings.advancedFilter &&
        !settings.simpleFilters?.length &&
        !settings.quickFilters?.length,
      'filtered_view_refused',
    )
    let cursor
    const cursors = new Set()
    for (let index = 0; index < config.maxPages; index++) {
      const result = await retryRead(() =>
        this.call('notion.query', {
          data: {
            mode: 'view',
            view_url: viewUrl,
            page_size: 50,
            ...(cursor ? { start_cursor: cursor } : {}),
          },
        }),
      )
      invariant(Array.isArray(result.results), 'query_unavailable')
      for (const row of result.results) {
        const url = notionUrl(row.url)
        invariant(!urls.has(url), 'duplicate_notion_page')
        urls.add(url)
        rows.push(row)
      }
      if (!result.has_more) return rows
      invariant(
        result.next_cursor && !cursors.has(result.next_cursor),
        'invalid_cursor',
      )
      cursor = result.next_cursor
      cursors.add(cursor)
    }
    throw new Error('pagination_limit')
  }
  async records() {
    const rows = await this.rows('Tarefas')
    const records = []
    for (const row of rows) {
      const record = page(await this.fetch(row.url))
      const project = record.properties[config.fields.project] ?? []
      if (!project.map(notionUrl).includes(config.project)) continue
      this.allowedPages.add(record.url)
      records.push(record)
    }
    return records
  }
  async create(item, content) {
    const properties = {
      [config.fields.title]:
        `SYNC-${item.evidence.kind.toUpperCase()}-${item.evidence.number ?? item.evidence.sha}`,
      [config.fields.project]: [config.project],
      [config.fields.status]: 'A validar',
      [config.fields.phase]: 'G3',
      [config.fields.priority]: 'Não definida',
      [config.fields.evidence]:
        `Fonte técnica: ${item.evidence.url}; conclusão de requisito não inferida.`,
    }
    const result = await this.call('notion.create', {
      parent: { data_source_id: config.sources.Tarefas },
      pages: [{ properties, content }],
    })
    invariant(result.pages?.length === 1, 'create_unconfirmed')
    return notionUrl(result.pages[0].url)
  }
  async append(url, content, position = 'end') {
    invariant(this.allowedPages.has(notionUrl(url)), 'page_write_scope')
    invariant(['start', 'end'].includes(position), 'write_forbidden')
    const id = notionUrl(url).split('/').at(-1)
    return this.call('notion.append', {
      page_id: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`,
      command: 'insert_content',
      position: { type: position },
      content,
    })
  }
  async dashboard(content) {
    const url = this.sections['Dashboard Geral']
    invariant(url, 'missing_section')
    return this.append(url, content, 'start')
  }
  async collect() {
    await this.validateScope()
    const records = await this.records()
    return {
      records,
      rows: {
        Tarefas: records.map((r) => r.properties),
        Decisões: await this.rows('Decisões'),
        Riscos: await this.rows('Riscos'),
      },
      schemaVersion: schemaFingerprint(),
      dashboard: this.dashboardPage,
    }
  }
}
