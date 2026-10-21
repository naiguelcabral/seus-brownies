# Usabilidade do catálogo — 18/10/2026

Estado: publicado e conferido no HML, versão
`3790b237-6f04-4c9a-aa5b-6c8425d20270`, a 100%, sob autorização específica.
Recibo `evidence/ux-hml-publication-2026-10-18.json`.
O usuário priorizou usabilidade antes das tarifas e solicitou
cadastro prático com botão para abrir um modal de preenchimento.

## Primeiro incremento: Produtos

Antes, o formulário permanecia aberto em uma coluna lateral. Na edição,
o usuário precisava encontrar essa coluna e as mensagens de resultado
ficavam vinculadas ao formulário.

Agora a lista ocupa a largura disponível. O botão **Adicionar produto** abre
o editor em um modal; os botões de edição abrem o mesmo editor preenchido.
Nome, SKU, tipo, unidade, categoria e preço ficam na primeira área. Descrição,
ponto de reposição e fornecedor ficam em **Mais informações (opcional)**,
aberta automaticamente na edição quando já houver informações.

O editor tem título acessível, foco inicial no nome, contenção de Tab,
fechamento por Escape/Cancelar/X e retorno ao botão de origem. Alterações
não salvas exigem confirmação de descarte. Durante o envio, controles e
fechamento ficam bloqueados; um guard também impede reenvio. Falha no
servidor mantém os valores e mostra um alerta. Sucesso fecha o editor e
mostra confirmação na lista; falha apenas ao atualizar a lista informa que
o produto já foi salvo, sem oferecer repetição ambígua da criação.

Dialog responsivo com rolagem, cabeçalho e ações fixos; ensaio visual em
1280×900 e 390×844. Sem nova dependência, migration ou modificação de dados.
Validação financeira, SKU único, estrutura de produtos usados, auditoria,
permissões de escrita e funções de servidor permanecem as existentes.
Gerentes continuam sem controles de escrita no catálogo.

Arquivos: `src/routes/produtos.tsx` e
`src/features/catalog/ProductEditor.tsx`. O teste do fornecedor informativo
acompanha a extração do formulário sem retirar sua asserção.

## Validação

- 507 testes Node aprovados.
- Cinco cenários Playwright aprovados: foco/Escape/retorno, erro e correção,
  descarte, ingrediente sem preço/envio em andamento, edição e tela móvel.
- Lint, tipos e Oxfmt aprovados.
- Knip: três achados anteriores, zero novos; baseline preservada. A fixture
  tem entrada explícita em `knip.json` porque é carregada por HTML no Vite.
- Build isolado de CI aprovado no commit `8b39b67`, com chave pública sintética
  explícita e árvore limpa. Warning não bloqueante de sourcemap CSS do Vite.
  Nenhuma publicação, CI remota ou CodeQL remoto executado nesta entrega local.

Comando do ensaio: `node node_modules/@playwright/test/cli.js test --config
playwright.product-editor.config.ts`. A configuração constrói somente o
editor real em uma fixture com dados sintéticos, CSS do aplicativo e respostas
locais. Usa configuração explícita, diretório de ambiente vazio e servidor
HTTP local, sem autenticação ou banco. Não executar o E2E operacional para
este ensaio. Resultados e capturas ficam em `/tmp/cacau-product-editor-*`.

Sandbox bloqueou a abertura da porta local; repetição autorizada fora da
restrição executou os testes. O primeiro ensaio identificou foco saindo do
dialog e isso foi corrigido. O teste visual também passou a carregar todas
as classes Tailwind do componente antes de conferir dimensões e capturas.

## Próximos incrementos propostos

1. Categorias e locais: substituir formulários laterais permanentes por
   ações claras de adicionar/editar com o mesmo padrão de interação.
2. Cenários: separar consulta da versão e criação do rascunho; apresentar
   o mix em percentuais compreensíveis e as ressalvas próximas da projeção.
3. Compras e produção: revisar a sequência de seleção, quantidades,
   prévia e confirmação preservando os gates e a rastreabilidade.

Esses itens ainda não foram implementados. A entrega atual cobre Produtos;
tarifas, fichas e rascunho de cenário permanecem em seu estado aprovado.
O gate de `DEVELOPMENT-WORKFLOW.md` (“deploy exige autorização específica e
chave pública real do alvo”) foi atendido pela autorização posterior e pelo
reuso da chave pública já publicada. HML atualizado e conferido; produção
permanece fora do escopo. Nenhuma migration necessária para este incremento.
