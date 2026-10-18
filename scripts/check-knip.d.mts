export type KnipFinding = {
  file: string
  type: string
  name: string
}

export function normalizeKnipReport(report: unknown): KnipFinding[]

export function compareKnipBaseline(
  findings: readonly KnipFinding[],
  baseline: unknown,
): { added: KnipFinding[]; resolved: KnipFinding[] }
