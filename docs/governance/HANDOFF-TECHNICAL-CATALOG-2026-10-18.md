# Handoff — preparação do cadastro técnico

Tarefa: próxima etapa O01–O04 após custos exatos publicados em HML.
Branch: `feat/input-catalog-kg-purchases`; início limpo em `b7da33e`.

## Concluído

- Conferência READ ONLY de catálogo e contagens na original; 36 produtos e
  nenhum cadastro de receita/perfil/tarifa ou fato de estoque/produção.
- Cruzamento do manifesto v4 com catálogo e prévia histórica versionada.
- Candidato offline: um insumo faltante, uma receita, sete linhas físicas,
  dois requisitos, duas tarifas, 17 perfis e 12 componentes de recheio.
- Identificada necessidade de lote separado: importador antigo carrega 17
  planejamentos históricos fora do escopo; não executá-lo com confirmação.
- Bombom/kit sem regra explícita completa de embalagem/cobertura, sem inferência.

## Arquivos

- `evidence/technical-catalog-preflight-2026-10-18.json`
- `evidence/technical-catalog-candidate-2026-10-18.json`
- `docs/governance/TECHNICAL-CATALOG-PREPARATION-2026-10-18.md`
- Este handoff e os checkpoints de status/roadmap.

## Verificações

Assertions de geração passaram: 36 SKUs distintos, domínio técnico vazio,
sete itens físicos com apenas Ovos Grandes ausente, unidades existentes
compatíveis, 17 produtos finais disponíveis, 14 regras de embalagem e 12
componentes aprovados de 20/40 g. Candidato JSON válido e hash do manifesto
registrado. Não houve alteração de código, importação, SQL de escrita,
migration ou deploy; não foi repetida a suíte de código não afetado.

Ainda não executados: SQL de aplicação, testes transacionais do novo lote,
revalidação do workbook, backup/ensaio para cadastro e homologação autenticada.

## Retomada

Ler o plano de preparação acima; construir/testar o SQL separado de cadastro
técnico, começando pelo insumo Ovos Grandes e pelos vínculos já aprovados.
Conservar o custo exato implementado; não usar custos históricos para estoque.
Não repetir catálogo ou recibos anteriores. Autorização humana específica de
escrita somente após pacote concreto e ensaiado. Sem decisão nova para recheios
ou tarifas já documentados; não inventar embalagem/cobertura de bombom e kit.

## Capacidade

Última leitura oficial: 4% restantes na janela de cinco horas, 74% na semanal;
reserva operacional 5%. Reset exibido: 18/10/2026, 10:29:36 America/Sao_Paulo.
Estado: pausado por reserva; encerramento oficial com DESLIGARTUDO a seguir.
Na retomada confirmar o saldo oficial e seguir CODEX-USAGE-POLICY.md; não há
retomada automática agendada por esta tarefa. Ao alcançar 5%, fechar checkpoint
e executar `./DESLIGARTUDO` em branch de trabalho, conforme a política.
