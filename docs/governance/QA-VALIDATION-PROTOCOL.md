# Protocolo de validação integrada — Cacau v1

Contrato de QA de 20/10/2026, decorrente de “Pode seguir com tudo que precisa
ser feito”. O acompanhamento permanece exclusivamente em
[ROADMAP-CODEX.md](ROADMAP-CODEX.md). Este protocolo define critérios e
evidências; não declara aceite nem cria outra fila.

## Ambientes, identidades e responsabilidades

| Camada | Destino e dados permitidos | Responsabilidade |
| --- | --- | --- |
| Unitários/contratos | Node 22, Python 3.12 na CI; fakes e arquivos temporários sintéticos | Agente executa e registra checks do SHA |
| Banco de negócio | PostgreSQL 17 local/serviço efêmero de CI em 127.0.0.1:5437 e :5439, nomes e papéis fixos dos runners | Agente cria somente laboratório vazio e encerra os containers que criou |
| Navegador de componentes/telas | Chromium, bundle explícito sem configuração/credenciais do app, backend simulado; rede HTTP somente 127.0.0.1 e WebSockets bloqueados | Agente executa a lista explícita de oito specs |
| Futuro ensaio interface + backend + identidade | Ambiente isolado próprio, banco sintético e identidades de teste próprias; sem promover papéis de contas reais | Operador confirma o ambiente/identidades; agente ensaia o fluxo conectado |
| HML compartilhado | Conferência não destrutiva; compras, produção e vendas reais continuam sem previsão | Dono decide fatos reais e aceite funcional; agente preserva histórico |
| Produção principal | Fora da execução automática | Dono revisa plano e autoriza especificamente a liberação |

Não ler arquivos de ambiente, exportar DSN, reutilizar cargas consumidas,
copiar dados pessoais para fixtures ou limpar banco compartilhado. Os runners
de negócio exigem versão/identidade exatas e zero tabelas antes de começar;
não apagam tabelas para repetir. Cada escrita sintética usa referência inédita.
Repetição local usa outro laboratório vazio. A cadeia de migrations tem ensaio
próprio; exportar DDL no ensaio de negócio não substitui a prova da cadeia.

## Contrato de cobertura e aceite

| Área do roadmap | Casos a comprovar | Evidência que vale |
| --- | --- | --- |
| T02 | Instalação, prefixos exatos, catálogo independente, preservação, replay, falha tardia e geração futura | Runner forward e recibos sintéticos; alvo compartilhado exige coleta própria |
| T03 | Repetição dos contratos e ensaios de negócio/navegador no SHA candidato | Jobs CI, PostgreSQL e browser concluídos; CodeQL triado separadamente |
| H04/H05 | Compra em kg/consumo em g → lote → venda → entrega/recebimento → CMV e lucro; replay, concorrência, falta de estoque, falha de auditoria e período fechado | Runners atuais comprovam backend/banco; aceite conectado exige também interface com esse backend |
| H04/H05 — lifecycle | Cancelamento antes da entrega, devolução sem retorno vendável, reembolso/crédito, resgate parcial e fechamento/correção | Contratos atuais mais ensaio conectado com fatos isolados e referências novas |
| H01/H02 | Login/logout, sessão expirada/revogada, OTP/reset, cooldown e Turnstile válido/inválido/replay | Identidade de teste autorizada e backend de autenticação isolado; mock não comprova comportamento do provedor real |
| H03 | Dono/Gerente/Produção/Funcionário; chamada direta permitida/negada e nenhuma escrita na negação | Matriz do servidor e evidência integrada por identidade, sem conceder papéis para contornar testes |
| H06 | Foco/teclado/Escape, estado de erro/reenvio, confirmação, celular sem rolagem horizontal, filtros/paginação/CSV e relatórios | Specs de fixtures comprovam os componentes cobertos; aceite por perfil exige fluxo conectado |

Qualquer falha de dinheiro, estoque, autorização, auditoria, idempotência ou
lifecycle bloqueia conclusão. Sucesso do job não dispensa examinar resultados
de segurança. Não registrar como aprovado um caso não executado ou um
resultado indisponível. Evidências guardam SHA, casos e status; nenhuma sessão,
cookie, email pessoal, string de conexão ou segredo. Captura automática,
vídeos e traces ficam desativados. Imagens solicitadas explicitamente pelos
specs existentes contêm somente dados sintéticos e ficam em `/tmp`.

## Execução reproduzível

```sh
npm test
npm run lint
npm run typecheck
npm run check
npm run knip:check
# HEAD versionado e árvore limpa; Chromium previamente instalado:
CACAU_SMOKE_BROWSER_PATH=/caminho/publico/do/chromium npm run test:e2e:isolated
# Somente os bancos descartáveis fixos dos runners:
env -i PATH="$PATH" node --throw-deprecation --import tsx scripts/test-exact-costs-disposable.ts --ack-disposable-postgres17
env -i PATH="$PATH" node --throw-deprecation --import tsx scripts/test-recovery-production-disposable.ts --ack-disposable-postgres17
```

Na CI, `.github/workflows/isolated-validation.yml` provisiona serviços
sintéticos e Chromium da versão Playwright fixada no lockfile. Não contém
secrets de aplicação, publicação ou conexão externa. O navegador recebe um
arquivo de configuração com lista explícita: specs antigas de ambientes
compartilhados não são descobertas por esse job. O wrapper usa `git archive`
do HEAD em diretório temporário e ambiente limpo. A aprovação funcional do
Dono permanece distinta dos checks técnicos.
