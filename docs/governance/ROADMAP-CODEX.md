# Roadmap executável para Codex — Cacau v1

Legenda:

- `[x]` concluído/entregue.
- `[ ]` não iniciado ou ainda pendente.
- `[~]` em andamento.
- `[!]` bloqueado por decisão, autorização ou dependência.

## Fase G0 — Governança do repositório

- [x] Criar status canônico do projeto.
- [x] Criar arquitetura canônica.
- [x] Criar regras de negócio canônicas.
- [x] Criar política de segurança.
- [x] Criar Definition of Done.
- [x] Criar gates de aprovação humana.
- [x] Criar roadmap executável.
- [x] Atualizar `AGENTS.md` com governança do Cacau preservando TanStack Intent.
- [x] Padronizar workflow Git e mensagens de commit.
- [x] Criar índice documental canônico.

### Saída da fase

O Codex consegue identificar estado, regras, limites e próxima tarefa sem depender de memória externa.

## Fase G1 — Segurança, autenticação e acesso

- [x] Definir ADR da solução de autenticação definitiva (`ADR-0001` aceito).
- [x] Mapear permissões e aplicar guards estruturais nas 30 Server Functions,
      com CSRF explícito e falha fechada sem principal válido.
- [~] Configurar integração externa Neon Auth em HML (secrets, callbacks,
  e-mail, Turnstile e rate limiting), sujeita a gate humano.
- [x] Preparar configuração versionada do Worker Cloudflare HML separado, sem
      deploy, secrets, rota ou DNS.
- [x] Aplicar a migration de infraestrutura de acesso `0014` somente no branch
      Neon de homologação autorizado, sem bootstrap de usuário.
- [ ] Implementar identidade de usuário.
- [ ] Implementar login/logout.
- [ ] Implementar sessão segura.
- [ ] Implementar recuperação de senha sem enumeração.
- [ ] Implementar limite de tentativas de login (máximo 5 antes de controle adicional).
- [ ] Implementar rate limiting de autenticação.
- [ ] Definir e implementar CAPTCHA/desafio adicional em fluxos suspeitos quando aplicável.
- [ ] Criar RBAC inicial: Admin, Gestor, Produção, Venda e Consulta, sujeito a validação humana.
- [ ] Proteger Server Functions por permissão.
- [ ] Proteger rotas de UI.
- [ ] Criar auditoria de autenticação e mudança de privilégio.
- [ ] Testes unitários/integrados de auth.
- [ ] Testes E2E de acesso.

### Gate

A estratégia Neon Auth baseada em Better Auth está aprovada. Provisionamento,
secrets, configuração de e-mail, revisão/aplicação de migrations e autorização
final por Server Function continuam sujeitos aos gates de `HUMAN-APPROVALS.md`.

## Fase G2 — Consolidação financeira, FIFO/CMV e margem

- [x] Estrutura FIFO criada.
- [x] Homologação FIFO G6–G9 documentada.
- [x] Lifecycle e testes principais existentes.
- [ ] Definir regra canônica de CMV realizado por venda.
- [ ] Decidir vínculo entre venda e camada/lote quando necessário para margem realizada.
- [ ] Implementar margem por produto de forma auditável.
- [ ] Implementar margem por período/canal/parceiro quando os dados suportarem.
- [ ] Criar reconciliação automatizada de estoque x FIFO x CMV.
- [ ] Criar relatório de divergências sem correção automática.
- [ ] Documentar estratégia de reversão/cancelamento de venda no FIFO.

### Gate

A definição de margem realizada e vínculo venda-lote é decisão de negócio/contabilidade e exige validação humana.

## Fase G3 — Dashboard e gestão

- [x] Dashboard operacional inicial.
- [x] Relatórios básicos por período.
- [ ] KPIs de faturamento e volume com comparação temporal.
- [ ] Ticket médio.
- [ ] Produtos e sabores mais vendidos, conforme modelo disponível.
- [ ] CMV e margem quando G2 estiver fechado.
- [ ] Estoque crítico e cobertura estimada.
- [ ] Produção por período e rendimento real.
- [ ] Perdas e coprodutos.
- [ ] Parceiros/canais com desempenho.
- [ ] Exportação CSV/Excel quando necessária.

## Fase G4 — WhatsApp e mensageria

- [ ] Definir ADR da integração WhatsApp Cloud API.
- [ ] Criar endpoint de webhook com validação de origem.
- [ ] Persistir evento recebido antes do processamento.
- [ ] Implementar idempotência por evento/mensagem.
- [ ] Criar parser determinístico para comandos estruturados simples.
- [ ] Adicionar camada de IA somente para interpretação, sem bypass das regras.
- [ ] Criar fluxo de prévia/confirmação para operações mutáveis.
- [ ] Criar estados `received`, `processing`, `processed`, `failed`, `ignored`.
- [ ] Criar retry seguro.
- [ ] Auditoria de cada mensagem e operação derivada.
- [ ] Testes de duplicidade/replay.

## Fase G5 — OCR e documentos

- [ ] Definir armazenamento de arquivos/documentos.
- [ ] Upload seguro de nota/cupom.
- [ ] OCR como extração candidata.
- [ ] Validação e categorização.
- [ ] Prévia humana antes de compra/estoque.
- [ ] Hash e deduplicação de documento.
- [ ] Vínculo documento ↔ compra.
- [ ] Política de retenção e privacidade.

## Fase G6 — Produção e operação definitiva

- [x] Receita-base e perfis.
- [x] Produção real em rascunho/conclusão.
- [x] Custos operacionais e coproduto.
- [x] Testes/homologações principais.
- [ ] Revisar UX de produção para operação diária.
- [ ] Relatórios de rendimento, perdas e custo por lote.
- [ ] Alertas de insumo insuficiente e planejamento.
- [ ] Revisar consistência entre custo médio físico e FIFO de produto final.
- [ ] Checklist de preparação para produção real.

## Fase G7 — Deploy e observabilidade

- [x] Configuração Cloudflare versionada.
- [x] Build/deploy command disponível.
- [ ] Definir ambientes development/staging/production formalmente.
- [ ] Configurar secrets por ambiente.
- [ ] Definir estratégia de backup Neon.
- [ ] Definir recuperação e RPO/RTO compatíveis com o negócio.
- [ ] Logs estruturados.
- [ ] Monitoramento de falhas.
- [ ] Alertas de erro e disponibilidade.
- [ ] Deploy definitivo somente após aprovação humana.

## Fase G8 — Autonomia progressiva do Codex

- [x] Testes e documentação suficientes para iniciar governança agent-friendly.
- [ ] Nível 1: Codex implementa tarefa explícita e apresenta diff/checks.
- [ ] Nível 2: Codex conclui pacote pequeno do roadmap e prepara PR.
- [ ] Nível 3: Codex escolhe próxima tarefa não bloqueada dentro de fase autorizada.
- [ ] Automação de revisão de CI/dependências, quando útil.
- [ ] Multiagente somente após estabilidade do workflow e proteção adequada da `main`.

## Prioridade imediata

1. Iniciar G1 por ADR e desenho de autenticação/RBAC.
2. Depois consolidar G2 (CMV/margem) antes de ampliar os relatórios gerenciais.
3. Não iniciar G4/G5 antes de segurança básica e idempotência estarem consolidadas.
4. Preservar todos os dados HML e evidências FIFO existentes.
