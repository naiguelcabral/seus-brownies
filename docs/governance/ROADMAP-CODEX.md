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
  e-mail, Turnstile e rate limiting), sujeita a gate humano. E-mail/senha,
  provedor compartilhado e origens confiáveis foram confirmados em leitura;
  Turnstile foi publicado com widget restrito e site key no bundle HML; limite
  distribuído, desafio real, validação integrada e replay seguem pendentes.
- [x] Publicar Worker Cloudflare HML separado em `workers.dev`, sem DNS, rota
      customizada ou alteração no Worker principal. Em 6 de setembro, o Worker
      recebeu o código atual e o smoke público confirmou `/login` com `200` e `/`
      sem sessão redirecionando para `/login`; a leitura pública sanitizada de
      A06 reconfirmou os mesmos resultados em 7 de setembro.
- [x] Aplicar a migration de infraestrutura de acesso `0014` somente no branch
      Neon de homologação autorizado, sem bootstrap de usuário.
- [~] Implementar identidade de usuário (cadastro e verificação OTP por
  e-mail disponíveis; a transição para Dono e um vínculo de Gerente foram
  auditados em HML e ambos os e-mails foram verificados; o Dono concluiu
  recuperação de senha, OTP, login e acesso operacional completo em HML;
  homologação integrada dos demais papéis e controles ainda está pendente).
- [~] Implementar login/logout por e-mail/senha via proxy server-side Neon Auth;
  validação operacional depende de identidade autorizada em HML.
- [~] Implementar sessão segura para SSR via cookies Neon Auth e adaptador
  request-scoped; validação operacional depende de identidade autorizada em HML.
- [~] Implementar recuperação de senha sem enumeração: fluxo por link/token,
  rota pública, token removido do histórico, auditoria sanitizada obrigatória
  em duas etapas e contratos/testes locais preparados; falta validação
  integrada controlada do Neon Auth e dos controles antiabuso.
- [~] Implementar limite de tentativas de login (máximo 5 antes de controle adicional):
  cooldown durável e limite local por identidade HMAC preparados; falta
  homologação com banco e limite distribuído.
- [~] Implementar rate limiting de autenticação: limite local para login,
  cadastro, OTP e reset preparado; binding distribuído HML permanece pendente.
- [~] Definir e implementar CAPTCHA/desafio adicional em fluxos suspeitos:
  verificador server-side e bloqueio fail-closed quando o desafio é exigido;
  Turnstile foi publicado, mas validação integrada e replay permanecem
  pendentes. A07 recebeu autorização humana em 7 de setembro, porém foi
  bloqueada antes de rede por ausência de navegador; não houve CAPTCHA, token
  ou replay. A correção local agora propaga o desafio do cooldown durável para
  a UI; ainda requer revisão/publicação e homologação HML.
- [~] Reestruturar RBAC inicial em Dono, Gerente e Funcionário: política,
  testes e migrations de transição aplicados em HML; o Dono e um Gerente
  possuem vínculos auditados. A verificação de e-mail e a liberação das demais
  identidades permanecem pendentes.
- [x] Proteger Server Functions por permissão no código versionado, por mapa
      central e middleware compartilhado; validar em HML após o deploy atual.
- [x] Proteger rotas de UI com redirecionamento SSR para a rota pública de login.
- [~] Criar auditoria de autenticação e mudança de privilégio: reset por senha,
  transição de papel e liberações manuais possuem eventos sanitizados; falta
  validação integrada e cobertura dos demais eventos.
- [~] Testes unitários/integrados de auth: testes unitários locais existem;
  testes integrados e E2E permanecem pendentes.
- [~] Testes E2E de acesso: spec de rotas públicas criada; execução integrada
  de login, logout, OTP, reset, sessão e negações ainda depende de ambiente e
  identidades de teste autorizados.

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

A matriz detalhada workbook × sistema está em
[`WORKBOOK-SYSTEM-PARITY.md`](./WORKBOOK-SYSTEM-PARITY.md).

- [x] Dashboard operacional inicial.
- [x] Relatórios básicos por período.
- [ ] KPIs de faturamento e volume com comparação temporal.
- [~] Ticket médio, preço médio, unidades e divergência de receita
  implementados localmente; aguardam migrations/homologação.
- [ ] Produtos e sabores mais vendidos, conforme modelo disponível.
- [ ] CMV e margem quando G2 estiver fechado.
- [~] Estoque crítico por ponto de reposição implementado localmente com
  comparação exata no estoque e dashboard, filtros e razão paginada; cobertura
  estimada continua aguardando histórico confiável.
- [~] Histórico de produção real por receita, status, produto e período
  implementado localmente com paginação; rendimento realizado já é rastreado
  nos lotes concluídos e aguarda homologação gerencial.
- [ ] Perdas e coprodutos.
- [~] Parceiros/canais com receita, eventos, unidades, ticket e divergência
  implementados localmente; margem e comparação temporal continuam pendentes.
- [~] Parâmetros gerenciais centralizados e plano de ação humano implementados
  localmente; migrations `0019`/`0020` não aplicadas.
- [~] Lote de fornecedor e validade por item de compra, com rastreabilidade na
  movimentação, implementados localmente; migration `0021` não aplicada.
- [~] Fornecedor padrão informativo por produto/insumo implementado localmente;
  migration `0022` não aplicada e nenhuma compra é preenchida automaticamente.
- [~] Exportação CSV segura dos relatórios operacionais concluída localmente;
  XLSX segue fora do escopo atual e não foi apresentado como integração.
- [~] Exibição monetária dos relatórios preserva a representação decimal exata
  sem conversão para `Number`; aguarda homologação visual.
- [~] Busca, filtros, paginação e estados explícitos implementados para os
  históricos de despesas, compras, vendas, produção real e razão de estoque, e
  para catálogo/saldos; produção e estoque passaram nos checkpoints locais
  WP-E1/WP-F2 e aguardam homologação de interface.

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
- [~] Worker HML isolado publicado e acessível publicamente: em 6 de setembro
  `/login` respondeu `200` e `/` sem sessão redirecionou para `/login`.
  Turnstile publicado, widget restrito, site key no bundle HML e diagnóstico
  histórico do `403` preservado; desafio real, replay, homologação integrada,
  rate limit distribuído e demais gates de G1 seguem pendentes.
- [ ] Definir ambientes development/staging/production formalmente.
- [ ] Configurar secrets por ambiente.
- [~] Runbook de backup Neon e cópia independente preparado; janela, storage,
  RPO e responsáveis dependem de decisão humana.
- [~] Runbook de restauração e ensaio descartável preparado; RTO, corte e
  validação em branch continuam dependentes de infraestrutura autorizada.
- [ ] Logs estruturados.
- [ ] Monitoramento de falhas.
- [ ] Alertas de erro e disponibilidade.
- [!] Revisar atualização de dependências auditadas: `npm audit` confirmou 13
  vulnerabilidades; a correção automática de Drizzle/Wrangler exige versões
  incompatíveis e depende de estratégia aprovada e validação completa.
- [ ] Deploy definitivo somente após aprovação humana.

## Fase G8 — Autonomia progressiva do Codex

- [~] Rodada manual local autorizada: checkpoint humano de A07-R2 confirmado
  em `c28c267`, com seis testes novos, suíte de 37 arquivos e lint verdes.
  Falha anterior de escrita em `.git` preservada no log. A07-R3 em avaliação
  local, sem promover autonomia permanente. Contrato no handoff.

- [x] Testes e documentação suficientes para iniciar governança agent-friendly.
- [x] Etapas 1–2 preparadas: fila, handoff, log, runbook, controlador local
      seguro e `LIGARTUDO --prepare-only`, todos cobertos por testes locais.
- [~] Nível 1: Codex implementa tarefa explícita e apresenta diff/checks.
- [ ] Nível 2: após revisão humana do piloto A01–A03, Codex conclui pacote
      pequeno, cria commit local e prepara PR.
- [ ] Nível 3: após três pacotes consecutivos verdes e sem correção humana ou
      gate violado, Codex escolhe próximo item exatamente `ready` em fase autorizada.
- [ ] Automação de revisão de CI/dependências, quando útil.
- [ ] Multiagente somente após estabilidade do workflow e proteção adequada da `main`.

## Prioridade imediata

0. Aprovar o modelo de membership e o mapeamento histórico de tenancy descritos
   em `MULTITENANCY-ADOPTION.md` antes de gerar/aplicar migration multitenant.
   Não atribuir `tenant-test-001` a fatos HML/produção nem alterar unicidades
   globais sem a decisão.
1. Decidir se haverá segundo Gerente e, se aprovado, informar a identidade a
   verificar antes de criar o vínculo auditado.
2. Executar a homologação integrada/E2E de G1, inclusive reset, login, sessão,
   negações por papel, cooldown e auditoria.
3. Depois consolidar G2 (CMV/margem) antes de ampliar os relatórios gerenciais.
4. Preservar todos os dados HML e evidências FIFO existentes.
