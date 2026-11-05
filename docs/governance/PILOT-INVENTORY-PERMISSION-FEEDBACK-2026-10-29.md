# Permissões visíveis no estoque e rascunho do piloto — 29/10/2026

## Correção integrada e publicada — 29/10/2026

PR #93 integrada normalmente em `844f425891bc8f264648361cb6c8bbfee5fb7c05`,
com árvore idêntica ao HEAD aprovado `08436e5`. Duas execuções finais da PR
passaram em todos os checks; três análises CodeQL do candidato `71e707c`
sem resultados/erros/avisos. Teste local final de 08436e5: 16/16 aprovados,
incluindo contagens após confirmação/refresh, foco/viewport e repetição sem
efeitos. A leitura antecipada de contadores encontrada na CI foi corrigida
no teste, sem retirar as asserções.

Main publicada com [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/40876652353),
[negócio/navegador](https://github.com/naiguelcabral/seus-brownies/actions/runs/40876652351)
e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/40876652256)
aprovados; três análises reais de 844f425 zeradas. Build/deploy isolado do
piloto concluído às 12:55:24 UTC (09:55:24 Brasília), versão
`48b34e2d-bf1b-40a4-b2d3-9a15c392bc90`, **100%**, deployment
`dc9aaf8a-d236-4f24-88b6-37d88d30bb31`. Substitui 16a49edf; mantém os
patches de segurança publicados anteriormente.

Leitura remota confirmou metadata, seis nomes de secrets, flags, limites e
observabilidade iguais. Smoke público às 12:55:43 UTC passou em oito GETs,
sem credenciais ou escrita. A rota protegida no navegador levou ao login:
a sessão anterior foi encerrada pela interface para entrada com a conta
Dono já identificada. Aceite autenticado da nova UI e complementos ainda
aguardam essa sessão; não confundir código publicado com execução do lote.

Contagens antes/depois do deploy preservadas: 3 compras, 7 itens, 7 movimentos,
1 rascunho, zero lotes concluídos, ajustes do workbook, vendas ou eventos
financeiros. Rascunho #1 permanece a retomar, sem criar outro. Nenhuma mudança
em contas/permissões, Auth gerenciado, HML anterior ou produção.

[Recibo da publicação](../../evidence/pilot-inventory-feedback-publication-2026-10-29.json)
e [smoke](../../evidence/pilot-inventory-feedback-http-smoke-2026-10-29.json).
Os estados de candidata/publicação pendente abaixo são históricos e superados.

## Problema e correção

Ao retomar o complemento autorizado do workbook, o ajuste positivo foi
recusado pelo servidor: a sessão tinha perfil Gerente, sem
`fifo:lifecycle:write`. A tela oferecia o formulário mesmo assim e a mensagem
ficava acima da grade, fora da área visível após o envio. A impressão de
botão sem resposta foi confirmada pelo usuário. Não houve ajuste persistido.

A candidata passa a usar as permissões já existentes para apresentar ações:
Dono e Administrador mantêm ajustes/perdas; Gerente mantém compensações
pós-entrega; Produção consulta o estoque sem esses formulários. Avisos
explicam o perfil necessário antes de qualquer preenchimento. O perfil atual aparece na própria seção. O resultado
recebe foco e semântica de alerta/status e permanece fixo dentro da seção
durante a rolagem, ficando visível também no celular após atualizar o histórico.
Orientações internas de migrations saem do texto normal da tela.

Não muda a matriz de acesso, o writer, a precisão, a idempotência ou a
autorização no servidor. A exibição é apenas experiência de uso, sem
substituir a verificação de cada requisição.

## Validação

Teste isolado anterior à correção reproduziu Gerente vendo um botão de
ajuste que deveria estar ausente. Candidata com 642 testes Node,
lint/tipos/formato, Knip (quatro contextuais e zero novos) e build isolado do
piloto aprovados. Os 16 testes conectados do laboratório PostgreSQL 17/navegador cobrem perfis,
ausência de efeitos nas leituras, inclusão permitida uma vez e erro de
repetição com foco/visibilidade no celular, sem nova escrita.

Na montagem local, o primeiro runner estava sem navegador configurado;
depois foram corrigidos nomes de colunas e espera de hidratação da fixture.
Uma inicialização do PostgreSQL não estava pronta; nenhuma dessas falhas
autoriza relaxar as asserções ou modificar dados do piloto.
A CI de push de f693fc8 detectou mensagem focada fora do viewport após
a atualização do histórico, embora a execução da PR tivesse passado. A
correção posterior mantém o retorno visível na seção e reforça a asserção
para esperar o histórico atualizado antes de conferir foco/viewport. Não
se tratou de falha descartada por repetição.

Integração, CI/CodeQL final e publicação desta correção de interface ainda
pendentes neste checkpoint. A atualização de segurança já publicada segue
no [recibo próprio](PILOT-SECURITY-PUBLICATION-2026-10-29.md).

## Preparação operacional

Rascunho **#1** criado pela aplicação em 29/10/2026, com receita versão 2,
uma receita e saída planejada de 24 unidades do produto 16 (brigadeiro 5×5).
A primeira tentativa retornou falha de verificação de sessão; leitura
independente confirmou zero lotes antes de tentar novamente. A segunda
tentativa criou somente um rascunho, auditado como
`production_batch.create`, com o mesmo ator Gerente das compras anteriores.

Observações identificam a simulação, o hash do workbook e os custos de
referência, sem declarar produção física. Bordinhas zero é premissa da
simulação. Sem conclusão, baixa, camada de produto final, venda ou pagamento.
O custo da prévia ainda não é custo final: faltam os quatro complementos.

Contagens após salvar: três compras/sete itens/sete movimentos, um lote em
rascunho, zero vendas/eventos financeiros. Saída planejada única de 24,
quantidade real e completed_at nulos. As quatro referências
`PILOT-WB-20261028-INS004/005/006/009` permanecem não consumidas.
Não criar outro rascunho nem gerar novas referências.

Usuário indicou três contas; consulta restrita de identidades e vínculos
encontrou um Dono ativo e dois Gerentes ativos, todos verificados e sem
bloqueio. A conta Dono foi identificada ao usuário em privado para entrar
na aba existente. Nenhuma identidade, e-mail ou segredo é versionado;
nenhum perfil foi alterado. Reconferir a sessão e os movimentos antes de
aplicar o plano privado. A PR #88 continua draft como registro de preparação
anterior, sem integrar seus checkpoints antigos por inferência.

I05 permanece parcial; I04, RPO/RTO/retenção e limites do Auth gerenciado
continuam pendentes. HML anterior e produção preservados.
