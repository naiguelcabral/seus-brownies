# Piloto WhatsApp com n8n e WAHA

Estado em 13/11/2026: preparação local. O piloto de WhatsApp ainda não está ligado. O usuário autorizou estruturar e implementar a integração n8n + WAHA para apenas dois telefones, inicialmente produção e estoque, com custos de referência do workbook e histórico automático. Não inferir vendas nem produção física.

## O que existe

- n8n local acessível e quatro laboratórios Ollama inativos. LAB-004 responde em chat de teste usando preços estáticos; não consulta o catálogo ou estoque e não é a integração WhatsApp.
- Cacau piloto já publicado com a política de simulação do workbook. A tabela `message_processing_records` é uma base de persistência, não uma implementação do processamento.
- `pilot-access.ts` fornece apenas uma política local: exige dois telefones E.164 e identidades distintas, rejeita configuração incompleta, terceiro número e conta inativa. O teste usa dados sintéticos. Não autentica webhook, não consulta permissões e não está conectado a nenhuma rota.
- `waha-signature.ts` valida a assinatura HMAC SHA-512 sobre os bytes recebidos, com vetor de teste publicado pelo WAHA. É um componente isolado, não um webhook completo. O cabeçalho de tempo não integra a assinatura documentada; não tratar esse tempo como proteção de replay. Persistência idempotente continua necessária.
- Nenhum contêiner WAHA foi encontrado no Docker local no momento da consulta. Isso não comprova ausência em outro servidor.

## Sequência de implementação

1. Identificar onde WAHA ficará hospedado, número da sessão e os dois participantes; guardar os dados privadamente, sem incluí-los em Git, logs ou exemplos. Confirmar o vínculo de cada telefone com a identidade e o perfil já existente; não conceder permissões automaticamente.
2. Definir e registrar a arquitetura n8n/WAHA, a rede e o tratamento de identificadores do provedor, inclusive LID, mensagens próprias e grupos. Não confiar no telefone fornecido por uma requisição sem origem autenticada. Restringir o acesso ao WAHA e autenticar/verificar eventos antes da autorização.
3. Construir entrada no servidor Cacau com credencial de integração de menor privilégio e resolução confiável do remetente para identidade ativa. Conferir RBAC em cada operação; negar falhas de configuração e ambientes não autorizados. A função local não substitui essas etapas.
4. Persistir evento e chave idempotente antes do processamento, com transações e concorrência; tratar replay, retries, evento com mesmo ID e conteúdo divergente, queda após confirmação e reprocessamento sem duplicidade. Registrar auditoria e resultados sem incluir credenciais ou conteúdo desnecessário.
5. Criar workflow n8n inativo, com recepção de evento, filtragem, ligação autenticada ao Cacau e resposta pelo WAHA. Validar o grafo antes de publicar. Usar somente consultas no primeiro teste; preços devem vir do Cacau, e não dos valores estáticos do LAB-004.
6. Implementar conversa de produção/estoque: interpretar entrada como proposta, esclarecer ambiguidades, exibir prévia e exigir confirmação vinculada à pessoa e à operação. Revalidar quantidade, permissões e estado no servidor antes de registrar. Estoque negativo e custos do workbook limitados à política existente do piloto.
7. Testar isoladamente dois telefones permitidos, terceiro bloqueado, grupo, identidade não resolvida, webhook inválido, duplicação, concorrência, confirmação repetida e indisponibilidades. Conferir operações e autoria no ambiente de teste; não usar SQL direto para simular autoria.
8. Configurar sessão real e ativar o fluxo no destino de teste após validação. Testar mensagens somente com os participantes autorizados. Manter rastreabilidade da versão e registrar pendências.

## Dependências para ativação

- Local/endereço de hospedagem do WAHA e número que ficará conectado à sessão.
- Dois números participantes e o vínculo de cada um ao usuário existente, por canal privado apropriado.
- Acesso operacional à sessão WhatsApp para pareamento, sem compartilhar código ou credencial no histórico.
- Mecanismo de autenticação entre WAHA, n8n e Cacau e destino de teste confirmados.

Não há comprovante de funcionamento ponta a ponta, publicação ou teste com celulares neste checkpoint. O aceite do piloto e a decisão de uso em produção permanecem separados.
