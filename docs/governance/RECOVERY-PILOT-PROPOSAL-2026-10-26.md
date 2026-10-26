# Recuperação, segurança e piloto — proposta de 26/10/2026

## Decisão atual

O Dono pediu seguir as cinco etapas. Para RPO/RTO/retenção escolheu preparar
a proposta e decidir depois. Depois definiu: **“Deixe tudo pronto, vou fazer
o teste com notas de compras reais de outros meses”**. O roteiro abaixo prepara
esse ensaio manual; operadora e janela serão definidas na execução. Não aprova prazos,
altera agenda, cria fatos operacionais ou libera produção.

## Evidência consultada na preparação

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
| S02/A04 | Configuração e publicação do piloto concluídas; validar concessão/sessão/reset reais com a pessoa | Grants/negações conferidos e recibos vinculados; aceite autenticado ainda pendente |
| L03 | Reconfirmar histórico/PITR, proteção de branches e suporte de observabilidade de consultas/conexões | Configuração atual, custo/suporte e revisão periódica; estatísticas agregadas não equivalem a auditoria individual |
| L04 | Definir separação de HML e produção antes de I04 | Mapa de destinos por hash, schema atual, política de sanitização e plano de troca; não reclassificar a base original por rótulo |
| L05 | Validar falhas de aplicação, banco e Auth e desenhar monitor protegido independente do computador | Endpoint sem dados pessoais, timeouts, alerta confirmado e comportamento em indisponibilidade; HTTP 200 público sozinho não fecha esse gate |
| L06 | Revisar finalidade e mínimo necessário de nome/telefone do cliente, e-mail/identidade e exports/logs | Política de acesso/retenção aprovada; anonimização futura auditável, preservando fatos financeiros e de estoque |
| L07 | Rever LCOV e a lista explícita de fontes não medidas, junto dos laboratórios PostgreSQL/browser | Baseline justificada por risco; percentual de linhas medidas não é cobertura global |

O novo diretório é de leitura limitada; não substitui a troca futura da role
operacional em L02. O código da candidata não deve ser publicado sem o recurso
novo, porque a conclusão de reset passa a falhar fechado sem identidade confiável.

## Entrada do piloto

O usuário fará o ensaio com notas históricas. Conferir os dados abaixo antes
de gravar. Não registrar nomes pessoais,
telefones ou valores comerciais dispensáveis no repositório público; os fatos
definitivos pertencem à aplicação e à trilha de auditoria.

| Informação | O que precisa ser confirmado |
| --- | --- |
| Operadora e janela | Pessoa disponível, perfil autorizado e período do acompanhamento |
| Compra real | Fornecedor, itens existentes, quantidades/unidades, valores totais reais e data |
| Produção prevista | Receita/perfil já aprovado, quantidade realmente produzida e insumos disponíveis; custos/rendimento reais conforme a rotina |
| Venda real | Produtos/quantidades/preços, canal/local, meio de pagamento e entrega prevista |
| Conferência | Responsável por comparar estoque, FIFO/CMV, recebimento, receita e lucro com os documentos da operação |

## Ensaio com notas de outros meses

Usar [Entrar no piloto](https://cacau-v1-piloto.naiguelcabral.workers.dev/login), versão `d4138431`, fonte `53e410e`, com a faixa “Ambiente de teste · Piloto com notas históricas”. Operação e Auth estão em cópias próprias, com um retrato dos fatos e identidades existentes. [Publicação conferida](PILOT-PUBLICATION-2026-10-26.md).

O HML anterior continua sobre a fonte original auditada. O ensaio das notas é no endereço do piloto. As cópias contêm histórico: conferir duplicidade antes de lançar. O roteiro não autoriza apagar dados depois nem repetir importações anteriores.

1. Separar uma nota por vez e conferir fornecedor, número/série ou referência
   do documento, data original, itens, quantidades, unidades, lotes/validade
   quando disponíveis e total efetivo de cada item. Guardar o documento fora
   do repositório público.
2. Consultar Compras pelo fornecedor e intervalo da data, percorrendo as
   páginas, e conferir também a origem/importação já auditada. Comparar itens,
   quantidades e valores; número da nota sozinho não comprova ausência. Se a
   compra já estiver representada, usar o registro existente para conferência.
3. No destino isolado, anotar saldo/valor inicial dos itens antes de lançar.
   Informar a data original da compra e a justificativa de ensaio com nota
   histórica nas observações. Não trocar a data por hoje para contornar um
   período fechado. Incluir uma referência privada rastreável ao documento.
4. Para compras em kg, informar quantidade comprada em kg e **valor total do
   item**. Conferir a conversão para a unidade do cadastro; o total da nota
   não é preço unitário a multiplicar novamente. Não presumir tratamento de
   frete, desconto, tributo ou rateio que o formulário não represente: se os
   totais não reconciliam, registrar a dúvida e parar antes de salvar.
5. Salvar uma vez e conferir histórico, itens, saldo, valor e autoria. Se a
   resposta falhar ou demorar, consultar primeiro o histórico; não abrir nova
   operação nem reenviar com referência nova sem reconciliar o resultado.
6. Produção, venda, recebimento e entrega exigem seus próprios fatos/documentos
   e sequência cronológica. Uma nota de compra não comprova esses eventos.
   A compra isolada pode ter aceite próprio; o piloto completo continua
   pendente até conferir também as demais etapas.

### Limites conferidos no código atual

- A proteção de repetição usa a chave da operação e o hash do conteúdo.
  A “Referência futura da nota fiscal” é texto livre, sem unicidade fiscal
  nem upload do documento. Uma nova operação com a mesma nota pode duplicar
  estoque; a checagem documental acima continua necessária.
- `purchasedAt` preserva a data informada. O movimento de entrada recebe o
  instante de gravação; para produto acabado comprado, a camada FIFO usa
  a data da compra às 12h UTC. Isso não reconstitui automaticamente saldos,
  consumos e CMV dos meses anteriores nem recalcula fatos já auditados.
- `persistPurchase` não consulta o fechamento financeiro. O bloqueio de
  despesa/recebimento em período fechado não equivale a um bloqueio geral de
  compras antigas. Conferir o período antes de qualquer lançamento definitivo;
  correção histórica depende do Dono, justificativa e trilha própria.
- Cadastrar a compra movimenta estoque; não comprova o pagamento ao fornecedor.
  Conferir os efeitos financeiros existentes antes de registrar outro evento,
  para evitar custo ou saída em duplicidade.

Essas observações delimitam o ensaio; não mudam a regra de estoque, datas,
FIFO ou fechamento. Diferença entre expectativa histórica e comportamento
deve virar caso de revisão antes de qualquer correção na base original.

### Recibo para preencher privadamente

| Campo | Registrar durante o ensaio |
| --- | --- |
| Ambiente | URL de teste, versão publicada e confirmação do destino isolado |
| Execução | Data/hora, perfil da operadora e janela acompanhada |
| Fonte | Referência privada da nota, data original e resultado da busca de duplicidade |
| Antes | Quantidade/unidade e valor de estoque por item |
| Lançamento | ID exibido no histórico, referência da operação se disponível, quantidade e total por item |
| Depois | Saldo esperado × observado, total esperado × observado e autoria conferida |
| Resultado | Aprovado, divergência ou não executado; reprodução e evidência sem segredos |
| Escopo restante | Produção, venda, recebimento e entrega: executado com fonte ou pendente |

## Roteiro executável após as confirmações

1. Concluir configuração e homologação de Auth/Turnstile, sessão/revogação e
   permissões dos perfis previstos. A pessoa opera sua própria credencial,
   OTP e desafio; o agente não recebe esses valores. Não conceder papel só
   para completar uma matriz de teste.
2. Conferir recuperação e os gates de sustentação acima. Registrar versão HML,
   configuração, responsáveis e referências novas; não repetir imports,
   bootstrap, homologações consumidas ou recibos de escrita anteriores.
3. Executar a compra confirmada conforme o roteiro de notas históricas acima,
   no destino isolado de teste; conferir unidades/valor total e entrada de
   estoque. Se faltar fonte ou saldo, interromper a sequência.
4. Criar o lote previsto e concluir uma única vez após conferir consumo,
   materiais, rendimento e custos. A ação deve conservar estoque e FIFO.
5. Registrar venda, recebimento e entrega reais na ordem correta; conferir
   tarifas, competência, caixa, CMV e lucro sem dupla receita/baixa/despesa.
6. Conferir relatório/CSV autorizado, controles de acesso, celular físico e
   rede móvel. Registrar problema, correção e repetição apenas do passo afetado.
7. Consolidar recibo sanitizado e aceite da operadora/Dono. I04 continua uma
   decisão humana posterior; piloto ou CI aprovados não autorizam produção.

Estado: diretório Auth configurado e ambiente isolado publicado, com smoke público e prova de redação aprovados. O próximo passo é a pessoa validar a própria entrada/perfil e realizar o ensaio das notas conforme este roteiro. Serviços reais, operação completa I05 e produção I04 continuam sem aceite. Nenhum novo fato de compra, produção ou venda foi criado pelo agente na retomada.
