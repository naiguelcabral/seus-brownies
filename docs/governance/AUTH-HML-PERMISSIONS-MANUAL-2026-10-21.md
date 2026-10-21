# Permissões HML — aceite manual em andamento — 21/10/2026

H03 permanece **parcial**. Fonte desta evidência: relatos do usuário executando
os passos no próprio tablet, em sessão separada da aba integrada do agente.
O agente não acessou credenciais, OTP, cookies, dados operacionais ou a sessão
do tablet. Perfil em teste: Funcionário, conforme o roteiro solicitado e o
menu relatado; vínculo/papel canônico no banco não foi relido nesta rodada.
Versão ativa do Worker não foi reconferida; último checkpoint documentado
bb76764/22733c04 não é prova nova da versão usada no tablet.

## Resultados relatados

| Caso | Resultado | Natureza da evidência |
| --- | --- | --- |
| Entrada no painel | Login relatado | Relato humano; não comprova expiração/revogação ou demais casos H01/H02 |
| Menu do Funcionário | Somente Compras, Vendas, Categorias e Produtos | Compatível com a política atual |
| Catálogo | Brownies e preços de venda visíveis | Leitura permitida ao Funcionário; não confundir preço de venda com custo |
| /estoque por endereço direto | Retornou para /compras | Bloqueio de navegação confirmado pelo usuário |
| /relatorios por endereço direto | Bloqueado, retorno esperado a Compras | Usuário confirmou ambos os bloqueios de Relatórios/Financeiro |
| /financeiro por endereço direto | Bloqueado, retorno esperado a Compras | Mesmo relato acima |
| /producao por endereço direto | Retornou para /compras | Usuário confirmou explicitamente os três casos após esclarecimento |
| /cenarios por endereço direto | Retornou para /compras | Mesmo esclarecimento acima |
| /parametros por endereço direto | Retornou para /compras | Mesmo esclarecimento acima |
| /despesas por endereço direto | Retornou para /compras | Usuário confirmou todos os três casos de Despesas/Locais/Plano de ação |
| /locais por endereço direto | Retornou para /compras | Mesmo relato acima |
| /plano-de-acao por endereço direto | Retornou para /compras | Mesmo relato acima |

## Ordem do menu solicitada

Após esses testes, usuário solicitou Vendas → Produtos → Compras → Categorias
para o Funcionário. Alteração somente de apresentação, preservando o filtro
por permissão e a ordem dos demais perfis. Preparada para a publicação
conjunta após a homologação; não foi publicada no HML por esta solicitação.

## Pendências

Concluir demais rotas restritas e leituras permitidas, sem salvar fatos
sintéticos. Identificar papel real e versão publicada por mecanismo autorizado;
testar Gerente/Dono com sessões próprias. A rota protegida não comprova por si
a negação de chamadas diretas às Server Functions: executor de leitura precisa
de preparação/revisão conforme o roteiro da PR #50. Não enviar mutações válidas
ao banco compartilhado para testar uma negação. H01/H02, auditoria, celular e
publicação conjunta permanecem etapas próprias no roadmap.

Não houve merge, deploy, alteração de papéis ou escrita de fatos nesta rodada.
Referências: [roadmap](ROADMAP-CODEX.md), [política de segurança](SECURITY.md) e
[PR #50](https://github.com/naiguelcabral/seus-brownies/pull/50).
