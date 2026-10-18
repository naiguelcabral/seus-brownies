# Usabilidade de Categorias e Locais — 18/10/2026

Continuidade aprovada pelo usuário com “Pode seguir” após proposta de listas
em largura total, botão Adicionar e cadastro/edição em modal para Categorias
e Locais. Publicação HML incluída na autorização de UX existente.

## Resultado

- Listas ocupam toda a área, sem formulário permanente ao lado.
- Categorias: busca por nome/descrição, filtro por situação, contagem dos
  resultados e ação Limpar filtros.
- Locais: filtros existentes por busca/tipo/situação preservados, ação Limpar
  filtros reinicia a página e os campos do formulário.
- Criação e edição em modal com campos obrigatórios identificados, foco,
  teclado, confirmação de descarte, bloqueio durante envio e valores
  preservados em erro. Dados opcionais existentes permanecem na edição.
- Mensagem de sucesso na lista. Falha ao atualizar a lista depois de salvar
  avisa que o registro já foi salvo, evitando sugerir um segundo envio.
- Diálogo compartilhado com Produtos; mesmas funções de servidor e RBAC.
  Classificações de local extraídas para módulo compartilhado com o validador.

Nenhuma migration, carga ou correção de dados é necessária. Ensaios usam
somente dados sintéticos em preview local sem conexão com o banco. A
conferência autenticada HML abre/cancela modais e utiliza filtros, sem salvar
cadastros ou alternar situação.

## Validação

509 testes Node e 13 cenários locais de navegador aprovados: oito dos novos
editores e cinco de regressão de Produtos. Cobrem validação, erro/reenvio,
edição, descarte, foco, envio pendente e tela de 390 × 844. Lint, tipos e
Oxfmt aprovados. Capturas locais em `/tmp/cacau-categoria-editor-mobile.png`
e `/tmp/cacau-local-editor-mobile.png`.

Conferência anterior ao deploy em READ ONLY: seis categorias, um local,
37 produtos, um cenário draft, nenhum ativo e zero vendas/compras/movimentos.
Digests completos dos dois cadastros registrados para comparar após deploy.
Build, publicação e conferência final serão registrados no recibo de entrega.

Cenários e revisão de Compras/Produção permanecem próximas tarefas separadas.
