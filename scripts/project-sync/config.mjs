import { fingerprint, invariant, notionUrl, safe } from './model.mjs'
// Synthetic bindings for fixtures; real workspace identifiers stay ignored/local.
export let config = Object.freeze({
  repository: 'naiguelcabral/seus-brownies',
  central: '00000000-0000-0000-0000-000000000001',
  project: 'https://app.notion.com/p/00000000000000000000000000000002',
  dashboard: 'https://app.notion.com/p/00000000000000000000000000000003',
  sources: {
    Projetos: 'collection://00000000-0000-0000-0000-000000000004',
    Tarefas: 'collection://00000000-0000-0000-0000-000000000005',
    Decisões: 'collection://00000000-0000-0000-0000-000000000006',
    Riscos: 'collection://00000000-0000-0000-0000-000000000007',
  },
  views: {
    Tarefas: 'view://00000000-0000-0000-0000-000000000008',
    Decisões: 'view://00000000-0000-0000-0000-000000000009',
    Riscos: 'view://00000000-0000-0000-0000-00000000000a',
  },
  sections: [
    'Dashboard Geral',
    'Cadastro de Projetos',
    'Roadmap e MVPs',
    'Backlog de Tarefas',
    'Documentação',
    'Decisões Técnicas',
    'Histórico de Execução',
    'Riscos e Impedimentos',
  ],
  fields: {
    title: 'Título',
    project: 'Projeto',
    status: 'Status',
    evidence: 'Evidências',
    phase: 'Fase',
    priority: 'Prioridade',
  },
  maxPages: 10,
  maxOperations: 50,
})
export function configureBindings(value) {
  safe(value)
  invariant(
    value.repository === config.repository &&
      /^[a-f0-9-]{36}$/.test(value.central),
    'binding_scope',
  )
  invariant(
    ['Projetos', 'Tarefas', 'Decisões', 'Riscos'].every((name) =>
      /^collection:\/\/[a-f0-9-]{36}$/.test(value.sources?.[name]),
    ),
    'binding_scope',
  )
  invariant(
    ['Tarefas', 'Decisões', 'Riscos'].every((name) =>
      /^view:\/\/[a-f0-9-]{36}$/.test(value.views?.[name]),
    ),
    'binding_scope',
  )
  const fields = value.fields ?? config.fields
  invariant(
    Object.keys(config.fields).every(
      (name) =>
        typeof fields[name] === 'string' &&
        fields[name].length > 0 &&
        fields[name].length < 80,
    ),
    'binding_scope',
  )
  config = Object.freeze({
    ...config,
    central: value.central,
    project: notionUrl(value.project),
    dashboard: notionUrl(value.dashboard),
    sources: { ...value.sources },
    views: { ...value.views },
    fields: { ...fields },
  })
}
export const schemaFingerprint = () =>
  fingerprint({
    fields: config.fields,
    central: config.central,
    project: config.project,
    sources: config.sources,
    views: config.views,
    dashboard: config.dashboard,
  })
