# Acesso e itens futuros

## Superfícies a proteger

Todas as rotas atuais dependem de Server Functions e exigirão sessão antes da
abertura para terceiros: categorias, produtos, compras, estoque, produção,
vendas, despesas e relatórios. As mutações de compra, venda, despesa e lote
devem registrar o usuário responsável quando a autenticação existir.

Perfis mínimos sugeridos:

- **Administração:** catálogo, preços, relatórios, usuários e todas as
  operações;
- **Operação:** compras, produção, vendas, despesas e leitura de estoque, sem
  administrar usuários ou alterar cadastros estruturais.

Proposta para Neon Auth: criar middleware de sessão no TanStack Start, injetar
o usuário e o papel no contexto do roteador e exigir o papel nas Server
Functions de mutação. A autorização deve ser verificada no servidor, não só na
interface. Esta proposta não configura credenciais nem define os perfis finais.

## Propostas curtas para itens fora do escopo

| Item | Objetivo e dados | Impacto e riscos | Critério de aceite |
| --- | --- | --- | --- |
| WhatsApp | Receber mensagens com ID do provedor, remetente e payload. | Cria vendas apenas por fluxo idempotente; exige permissão de operação e validação de assinatura. | Repetições não duplicam registros e falhas podem ser reprocessadas. |
| Pagamentos | Registrar provedor, referência, valor e status. | Atualiza apenas o status financeiro da venda; risco de webhook duplicado/fraude. | Evento autenticado altera uma venda uma única vez e mantém auditoria. |
| Nota fiscal | Armazenar arquivo, tipo, origem e vínculo com compra. | Não altera saldo por si só; requer permissões e retenção segura. | Arquivo privado fica vinculado à compra sem expor URL pública. |
| Entrega | Endereço, taxa, raio, janela e status. | Compõe total de venda sem alterar itens de estoque; envolve dados pessoais. | Taxa e janela são auditáveis e visíveis antes da confirmação. |
| Vitrine/carrinho | Criar intenção de compra usando catálogo e disponibilidade. | Deve converter para `sales`/`sale_items`, sem criar `orders` sem decisão; risco de reservar estoque indevidamente. | Conversão preserva preço/itens históricos e aplica a política de estoque definida. |
