# Aceite de autenticação e permissões no HML — H01–H03

## Objetivo e estado

Preparação revisável de 21/10/2026. Entrada das três contas confirmada pelo
usuário; laboratório de permissões aprovado. O aceite integrado completo
continua pendente. Este roteiro não é um recibo de execução no provedor real.

Alvo de navegação: [Cacau HML](https://cacau-v1-hml.naiguelcabral.workers.dev/login).
Antes de executar, confirmar versão publicada e papel real de cada vínculo.
O banco operacional original tem dados auditáveis e não é laboratório, mesmo
quando acessado pelo Worker HML.

Fontes: [matriz atual](AUTHORIZATION-MATRIX.md),
[protocolo de QA](QA-VALIDATION-PROTOCOL.md) e
[aprovações](HUMAN-APPROVALS.md).

## 1. Aceite assistido com as contas existentes

A pessoa entra diretamente no navegador e mantém senha, OTP e links privados
sob seu controle. O operador acompanha resultados e registra apenas o papel,
o caso, a data e o resultado sanitizado. Não pedir senha ou OTP na conversa.
Usar sessões separadas por perfil; não encerrar uma sessão alheia para testar.

| Caso | Ação | Resultado esperado |
| --- | --- | --- |
| H01-A | Abrir `/` sem sessão, em contexto separado | Redireciona para `/login`; nenhum dado operacional aparece |
| H01-B | Entrar com conta ativa e verificada | Dono/Gerente abre `/`; Funcionário abre `/compras` |
| H01-C | Recarregar a página autorizada | Sessão preservada e mesmo perfil; nenhuma nova autenticação inesperada |
| H01-D | Clicar em Sair e tentar voltar à rota operacional | Volta ao login; recarregar ou voltar no navegador não restaura acesso |
| H03-A | Gerente abrir catálogo, estoque, produção, relatórios e financeiro | Leitura disponível conforme a matriz; não salvar operações |
| H03-B | Gerente abrir `/parametros` e `/fifo-migration-audit` pela URL | Redireciona para `/`; conteúdo restrito não aparece |
| H03-C | Funcionário abrir catálogo, compras e vendas | Seletores/formulários permitidos; sem histórico geral ou valores financeiros restritos |
| H03-D | Funcionário abrir `/estoque`, `/producao`, `/relatorios`, `/financeiro`, `/cenarios`, `/parametros` pela URL | Redireciona para `/compras`; conteúdo restrito não aparece |
| H03-E | Dono abrir áreas administrativas já autorizadas | Áreas disponíveis; não mudar configuração nem executar probe temporário |

Conferir o papel antes de H03-E: conta chamada “Dono” informalmente pode ter
vínculo `manager`. Não promover uma conta para satisfazer este roteiro.
Uma opção indisponível por falta de dados não comprova negação de permissão.

### Chamadas diretas ao servidor

A guarda de rota não fecha H03 sozinha. Em sessão própria autorizada, conferir
também funções de leitura representativas já existentes: `getDashboard`,
`listInventory`, `getOperationalReports`, `getFinancialOverview`,
`getManagementSettings` e `getFifoMigrationAudit`, conforme a matriz.

Identificar o transporte e os identificadores da versão publicada, sem
adivinhar URLs ou registrar cabeçalhos/cookies/respostas com dados. Uma negação
deve ser de autenticação/autorização, sem retornar payload protegido;
`400`, erro de rede ou falha de validação não valem como negação de RBAC.
Não repetir chamadas em massa. Esse executor conectado ainda precisa de
preparação e revisão: a spec abaixo cobre navegação, não chamadas diretas.

Não enviar payload válido de compra, venda, produção, pagamento ou ajuste para
“ver se é negado” na base compartilhada. Se a guarda falhar, isso criaria um
fato indevido. A ausência de escrita nas negações e a matriz de mutações são
comprovadas no laboratório isolado; execução publicada de uma operação exige
fato real e autorização correspondente.

## 2. Etapas que precisam de identidade e cenário próprios

| Caso | Preparação necessária | Evidência exigida |
| --- | --- | --- |
| OTP / primeiro acesso | Conta de teste autorizada, sem reaproveitar as contas ativas para recadastro | Código recente validado pela pessoa; retorno ao login; identidade permanece a mesma |
| Recuperação | Solicitação e redefinição feitas pela própria pessoa | Nova senha funciona; antiga não autentica; sem registrar nenhuma delas |
| Expiração / revogação | Sessão e vínculo de teste próprios, com plano específico para alteração/reversão | Próxima chamada protegida negada; auditoria correspondente |
| Sem vínculo / inativo / não verificado | Identidades próprias previamente autorizadas nessas condições | Falha fechada, sem dados operacionais |
| Cooldown / limiter distribuído | Janela e volume aprovados em ambiente isolado, backend de controle real | Limites entre instâncias e retomada após janela; sem bloquear contas operacionais |
| Turnstile válido / inválido / replay | Navegador humano e backend real em alvo isolado/autorizado | Desafio válido aceito; inválido e reutilizado negados antes da operação; auditoria sanitizada |

Fixtures ou chaves públicas de teste não comprovam o Turnstile real.
Não desativar captcha, auditoria, verificação de e-mail ou limitação para
completar os casos. Configurar um cenário isolado com provedor real também
precisa de escopo próprio antes de criar identidades ou alterar configuração.

## 3. Suíte existente e correção da coleta

Arquivos: `e2e/auth-hml-non-destructive.spec.ts` e
`playwright.auth-hml.config.ts`. O alvo é fixo; execução conectada exige
`CACAU_HML_AUTH_E2E=authorized` e entrada privada autorizada para cinco
identidades distintas: Dono, sem vínculo, inativa, papel insuficiente e e-mail
não verificado. Não colocar essa entrada em comandos, arquivos versionados,
logs ou conversa. Preferir o aceite assistido para as contas operacionais.

O teste local `test/auth-hml-e2e-contract.test.ts` coleta a suíte com `--list`,
identidades sintéticas `.invalid` e ambiente mínimo. Não abre navegador nem
conecta ao HML. Verifica seis casos executáveis e quatro pendências humanas
individuais. Antes da correção, quatro `test.fixme(true, ...)` globais marcavam
os seis casos como ignorados. A coleta agora diferencia preparação de execução.

Os quatro itens humanos continuam explicitamente pendentes. O caso de papel
insuficiente passa a esperar o redirecionamento da guarda atual, em vez da
antiga tela de erro de relatório. Nenhum destes ajustes comprova login real.
Screenshots, vídeo e trace permanecem desativados na suíte conectada.

## 4. Registro de execução e critério de encerramento

Registrar somente dados sanitizados:

- data/hora, versão do Worker e referência do código;
- caso, papel canônico e resultado: aprovado, falhou ou não executado;
- observação sem e-mail, nome, senha, OTP, token, cookie, URL privada ou dados
  financeiros/operacionais;
- referência de auditoria sanitizada quando aplicável, revisada por operador
  autorizado sem exportar o payload do provedor.

Não marcar H01/H02/H03 como concluídos enquanto faltarem os respectivos casos,
chamadas diretas ou auditoria. Falha de segurança ou exposição de dados bloqueia
o aceite; preservar o relato sanitizado e corrigir antes de repetir.
