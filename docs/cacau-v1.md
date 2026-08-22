# Cacau v1

## Escopo entregue

- Vitrine pública com três sabores iniciais e preços em centavos.
- Carrinho no navegador, retirada ou entrega e observações do cliente.
- Server Function validada com Zod para registrar pedidos.
- Modelo Drizzle para catálogo, pedidos e itens com preço congelado no ato da compra.
- Worker Cloudflare nomeado `cacau-v1`, sem painel de desenvolvimento no site público.

## Banco de dados

O schema canônico está em `src/db/schema.ts`. Antes de aceitar pedidos de verdade,
gere e aplique a migration usando os scripts já existentes no `package.json`:

```bash
npm run db:generate
npm run db:migrate
```

Configure a URL de conexão somente no ambiente local ou como secret do Worker.
Não versione arquivos locais de ambiente.

## Próximas decisões de produto

1. Definir número/canal de confirmação e integrar uma notificação após o pedido.
2. Criar área autenticada para alterar catálogo e status do pedido.
3. Definir regra de taxa, raio e janela de entrega.
4. Integrar pagamento após validar o fluxo operacional manual.
