# Recuperação, segurança e piloto — proposta de 26/10/2026

## Decisão atual

O Dono pediu seguir as cinco etapas. Para RPO/RTO/retenção escolheu preparar
a proposta e decidir depois. Informou que enviará a operadora e os fatos reais
do piloto. Este documento organiza essas duas decisões; não aprova prazos,
altera agenda, cria fatos operacionais ou libera produção.

## Evidência atual

- Integrações #73 e #76 concluídas, com CI/CodeQL de cada main aprovados.
- HML relido na API: versão `42da8a96`, deployment `5db64ef3`, 100% do tráfego;
  cinco nomes de secrets anteriores. Nenhuma nova publicação nesta rodada.
- Agenda local de backup ativa: semanal, quinta-feira, às 00h15 no valor salvo;
  fuso ainda a conferir no agendador. O texto da tarefa pede diário às 03h
  de Brasília. A divergência permanece visível, sem alteração automática.
- Pasta externa consultada: três pares dump/manifesto, de 20, 21 e 22/10.
  Último dump: 22/10 06h00 UTC, upload 06h05 UTC, 225.192 bytes; manifesto
  correspondente com 675 bytes. Seis arquivos relidos: parent correto,
  `shared=false` e somente permissão de proprietário. Nenhum download,
  restauração, exclusão, upload ou compartilhamento novo nesta consulta.
- A API de agenda de snapshots da branch operacional retornou lista vazia.
  Isso não mede a janela PITR nem prova inexistência de outras cópias.
- Restore externo de 21/10 continua como evidência histórica: 38 tabelas e
  36 recibos conferidos. O dump `public/drizzle` exclui Auth; não comprova
  recuperação completa de identidades, sessões ou credenciais.
- Não havia sessão autenticada no navegador disponível ao agente. Não foram
  executados login/reset/OTP/Turnstile com credenciais ou sessões de pessoas.

## Opções para decisão do Dono

| Opção proposta | Objetivo | Retenção proposta | Condição para aceitar |
| --- | --- | --- | --- |
| A — diário às 03h de Brasília | RPO de 24 h; RTO de 4 h | 30 dias | Execução e upload comprovados, alerta de falha e ensaio cronometrado de recuperação, incluindo Auth |
| B — a cada 6 h | RPO de 6 h; RTO de 2 h | 30 dias | Além das provas acima, agendador independente do computador, capacidade/plano/custo revistos |

Esses valores são metas para revisão, não garantias já medidas. A opção A
também precisa de execução independente se o computador/app puder ficar
indisponível. A retenção proposta refere-se às cópias de segurança; não define
o prazo legal ou operacional dos dados de clientes na aplicação. Não apagar
cópias existentes para implementar qualquer opção.

O Dono deve definir responsável e substituto, janela de manutenção, destino
privado, retenção das cópias e tratamento de Auth. Após a decisão: ajustar a
automação existente, confirmar fuso/agenda por readback e acompanhar uma
execução com recibo de exportação/upload/privacidade. Alerta exige confirmação
de entrega; não enviar notificações de teste sem autorização aplicável.

Para Auth, revisar recuperação nativa da branch de identidades e um ensaio
isolado que preserve a relação entre IDs do provedor e `app_user_access`.
Não copiar tabelas de senha/token para documentos, logs ou evidência pública.
Restore de prova acontece em destino descartável autorizado, preservando a
origem, as cópias existentes e os recibos anteriores.

## Segurança e sustentação antes do piloto

| Frente | Próxima ação concreta | Evidência para fechar |
| --- | --- | --- |
| A01 | Consolidar o recibo sanitizado da revisão de credenciais e acessos de 17–22/10, sem reutilizar/testar o valor antigo | Método, UTC e abrangência; logs de conexão do provedor quando disponíveis |
| L02 | Confirmar a identidade SQL no contexto real do Worker, preparar a role operacional sem propriedade/DDL e ensaiar todos os writers antes da troca | Probe do Worker, matriz por tabela/sequência, testes de negação e readback do binding; o usuário SQL do MCP não prova a role do Worker |
| S02/A04 | Preparar a role restrita do diretório na branch Auth, ativar credencial e binding somente após revisão do pacote concreto | SQL proposto, grants por coluna/função, ausência de leitura de credenciais, endpoint correto e secret por nome, sem expor valor |
| L03 | Reconfirmar histórico/PITR, proteção de branches e suporte de observabilidade de consultas/conexões | Configuração atual, custo/suporte e revisão periódica; estatísticas agregadas não equivalem a auditoria individual |
| L04 | Definir separação de HML e produção antes de I04 | Mapa de destinos por hash, schema atual, política de sanitização e plano de troca; não reclassificar a base original por rótulo |
| L05 | Validar falhas de aplicação, banco e Auth e desenhar monitor protegido independente do computador | Endpoint sem dados pessoais, timeouts, alerta confirmado e comportamento em indisponibilidade; HTTP 200 público sozinho não fecha esse gate |
| L06 | Revisar finalidade e mínimo necessário de nome/telefone do cliente, e-mail/identidade e exports/logs | Política de acesso/retenção aprovada; anonimização futura auditável, preservando fatos financeiros e de estoque |
| L07 | Rever LCOV e a lista explícita de fontes não medidas, junto dos laboratórios PostgreSQL/browser | Baseline justificada por risco; percentual de linhas medidas não é cobertura global |

O novo diretório é de leitura limitada; não substitui a troca futura da role
operacional em L02. O código da candidata não deve ser publicado sem o recurso
novo, porque a conclusão de reset passa a falhar fechado sem identidade confiável.

## Entrada do piloto

O usuário informou que enviará os dados abaixo. Não registrar nomes pessoais,
telefones ou valores comerciais dispensáveis no repositório público; os fatos
definitivos pertencem à aplicação e à trilha de auditoria.

| Informação | O que precisa ser confirmado |
| --- | --- |
| Operadora e janela | Pessoa disponível, perfil autorizado e período do acompanhamento |
| Compra real | Fornecedor, itens existentes, quantidades/unidades, valores totais reais e data |
| Produção prevista | Receita/perfil já aprovado, quantidade realmente produzida e insumos disponíveis; custos/rendimento reais conforme a rotina |
| Venda real | Produtos/quantidades/preços, canal/local, meio de pagamento e entrega prevista |
| Conferência | Responsável por comparar estoque, FIFO/CMV, recebimento, receita e lucro com os documentos da operação |

## Roteiro executável após as confirmações

1. Concluir configuração e homologação de Auth/Turnstile, sessão/revogação e
   permissões dos perfis previstos. A pessoa opera sua própria credencial,
   OTP e desafio; o agente não recebe esses valores. Não conceder papel só
   para completar uma matriz de teste.
2. Conferir recuperação e os gates de sustentação acima. Registrar versão HML,
   configuração, responsáveis e referências novas; não repetir imports,
   bootstrap, homologações consumidas ou recibos de escrita anteriores.
3. Registrar somente a compra real confirmada; conferir unidades/valor total
   e entrada de estoque. Se faltar fonte ou saldo, interromper a sequência.
4. Criar o lote previsto e concluir uma única vez após conferir consumo,
   materiais, rendimento e custos. A ação deve conservar estoque e FIFO.
5. Registrar venda, recebimento e entrega reais na ordem correta; conferir
   tarifas, competência, caixa, CMV e lucro sem dupla receita/baixa/despesa.
6. Conferir relatório/CSV autorizado, controles de acesso, celular físico e
   rede móvel. Registrar problema, correção e repetição apenas do passo afetado.
7. Consolidar recibo sanitizado e aceite da operadora/Dono. I04 continua uma
   decisão humana posterior; piloto ou CI aprovados não autorizam produção.

Estado: roteiro preparado; operadora/fatos ainda não informados. Não houve
compra, produção, venda ou outro fato real/fictício criado nesta preparação.
