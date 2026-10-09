# Atestação do operador — bases, Worker e recuperação

Estado: `pending-human`. Nenhuma resposta abaixo está aprovada. Preencher
privadamente; publicar apenas IDs, hashes, conclusão e aceite sanitizados.
Não anexar DSN, secret, usuário de login sensível, dump ou exportação de negócio.

## Declaração de abrangência

- Operador responsável / revisor independente: `PENDING-HUMAN`.
- UTC da revisão / ticket e versão desta declaração: `PENDING-HUMAN`.
- Projetos/organizações/contas examinados: `PENDING-HUMAN`.
- Bases compartilhadas adicionais, outras contas/provedores, bases locais
  operacionais, cópias exportadas e dumps/restaurações relevantes: `PENDING-HUMAN`.
- Listagem ou declaração explícita de inexistência de cada categoria: `PENDING-HUMAN`.
- Critério de relevância e bases excluídas, com justificativa: `PENDING-HUMAN`.
- Aceite explícito: “Revisei a abrangência, incluindo cópias/restaurações;
  não inferi inexistência pela lista da API”: `PENDING-HUMAN`.

## Ficha obrigatória para cada base

Preencher cinco fichas, uma para cada ID abaixo, e uma para cada base adicional:

1. `cool-base-25902164` / `br-empty-frog-acy6xycn`.
2. `cool-base-25902164` / `br-lively-term-ac9i0mvr`.
3. `steep-brook-51659857` / `br-lingering-wind-acwh5wap`.
4. `steep-brook-51659857` / `br-bitter-dew-ac31uci9`.
5. `steep-brook-51659857` / `br-patient-lake-ac2t0cvq`.

| Campo por base                                                          | Resposta        |
| ----------------------------------------------------------------------- | --------------- |
| Projeto/branch/endpoint/database, identidade sanitizada                 | `PENDING-HUMAN` |
| Finalidade e ambiente efetivo                                           | `PENDING-HUMAN` |
| Origem, é cópia?, data UTC da cópia, relação com produção               | `PENDING-HUMAN` |
| Dados pessoais presentes / classificação                                | `PENDING-HUMAN` |
| Responsável, retenção e política de exclusão                            | `PENDING-HUMAN` |
| Histórico completo, hashes/timestamps, fonte privada e revisor          | `PENDING-HUMAN` |
| Catálogo/digest e referência descartável pertinente                     | `PENDING-HUMAN` |
| Aplicação manual/parcial ou ausência comprovada                         | `PENDING-HUMAN` |
| Backup disponível, tipo, identificador sanitizado                       | `PENDING-HUMAN` |
| Último backup UTC, conclusão comprovada, retenção e localização privada | `PENDING-HUMAN` |
| Restauração testada?, UTC, ambiente isolado e resultado                 | `PENDING-HUMAN` |
| RPO, RTO e limite de indisponibilidade                                  | `PENDING-HUMAN` |
| Restauração independente possível?, dependências e responsável          | `PENDING-HUMAN` |
| Restrições legais/operacionais e aprovação                              | `PENDING-HUMAN` |
| Conexão de auditoria aprovada, ticket e validade ≤4h                    | `PENDING-HUMAN` |
| Identidade role/session_user conferida privadamente / fingerprint       | `PENDING-HUMAN` |
| ACLs/ownership/capabilities/PUBLIC revisados; resultado do diagnóstico  | `PENDING-HUMAN` |
| Teste negativo em fixture equivalente, SQLSTATE e evidência             | `PENDING-HUMAN` |
| Expiração/revogação pelo operador e reconexão bloqueada                 | `PENDING-HUMAN` |
| Relação com Worker ativo e nível de confiança                           | `PENDING-HUMAN` |
| Operador, revisor, UTC e aceite explícito                               | `PENDING-HUMAN` |

Snapshot/PITR anunciado não é backup válido sem ponto identificável,
conclusão/retensão comprovadas e restauração testada. Consultar
[OPERATIONS-RESILIENCE-RUNBOOK.md](OPERATIONS-RESILIENCE-RUNBOOK.md);
nenhum ensaio/restauração ou nova branch está autorizado aqui.

## Procedimento privado de atestação do Worker

1. Operador autorizado reconfirma deployment e versões efetivamente ativos
   pelos metadados somente leitura, incluindo percentual de todas as versões.
2. Conferir o destino por documentação operacional privada de gestão do
   binding daquela versão. O agente não recupera o secret; não criar endpoint,
   ler logs, fazer deploy ou modificar o binding para obter a informação.
   Se o operador não possui fonte privada aprovada, manter `blocked`.
3. Em terminal local privado sem gravação/telemetria, executar apenas:

   ```bash
   node scripts/hml-worker-destination.mjs
   ```

   A ferramenta exige TTY e entrada oculta, sem argumento de URL, pipe,
   variável de ambiente ou arquivo. O operador insere o valor privadamente
   pelo mecanismo já autorizado; não pedir ao agente para lê-lo ou copiá-lo.
   Não usar terminal compartilhado, gravação de sessão ou clipboard sincronizado.

4. O utilitário aceita somente postgres/postgresql, porta padrão, host Neon e
   database simples. Recusa parâmetros conhecidos de roteamento (options,
   host, port, dbname, database, endpoint, branch, project) e fragmentos.
   Descarta usuário, senha e os demais parâmetros antes
   de emitir resultado; não grava URL. Host pooler normaliza para host direto,
   case normaliza e porta 5432 entra no fingerprint. Project/branch só vêm de
   match único da matriz, nunca do username. Produção é recusada.
5. Hash do destino normalizado `host:5432/database`: SHA-256. Copiar somente
   JSON sanitizado ao formulário. Match não comprova HML, ausência de migração
   ou a origem do secret; a atestação humana vincula a fonte à versão ativa.
   Uma URL que transporta parâmetros de roteamento especiais não é atestável
   por este normalizador: operador deve confirmar roteamento privado e parar
   se o host/database sozinho não define o destino inequivocamente.
6. Nenhuma URL permanece em arquivo ou saída; a memória é liberada ao término
   do processo. O runtime JS não garante zeroização física de strings; usar
   dispositivo privado sem swap/core dump/inspeção de memória para esse procedimento.
   Encerrar o processo e limpar o meio privado de entrada conforme a política.
7. Reconfirmar deployment/versões após atestar. Mudança invalida o vínculo;
   múltiplas versões ativas exigem uma atestação por versão, não presumir igualdade.

## Formulário do Worker

| Campo                                                | Evidência / resposta                                |
| ---------------------------------------------------- | --------------------------------------------------- |
| Worker / conta                                       | `cacau-v1-hml` / `7cfc884f81d5b5e519a78407465a6e8f` |
| Deployment observado via API                         | `8268b409-34bc-4881-9694-52c292da2da3`              |
| Versão observada / tráfego                           | `e241b715-99bf-4a83-82ba-eef24fedadaa` / 100%       |
| Deployment/versão reconfirmados pelo operador        | `PENDING-HUMAN`                                     |
| UTC inicial/final, operador e revisor                | `PENDING-HUMAN`                                     |
| Proveniência privada do destino vinculado à versão   | `PENDING-HUMAN`                                     |
| Host sanitizado / database / fingerprint             | `PENDING-HUMAN`                                     |
| Projeto / branch / endpoint sanitizados              | `PENDING-HUMAN`                                     |
| Match único e declaração do ambiente efetivo         | `PENDING-HUMAN`                                     |
| Nenhum secret persistido ou exibido; entrada privada | `PENDING-HUMAN`                                     |
| Roteamento conferido e nenhuma alteração externa     | `PENDING-HUMAN`                                     |
| Aceite explícito e validade da atestação             | `PENDING-HUMAN`                                     |

## Critérios de aceite

Revisor independente confere abrangência, correspondência com metadados
atuais, proveniência, consistência UTC, validade do acesso e versão ativa.
Campos pendentes mantêm os gates abertos. Aceite deste formulário não autoriza
criação de roles, concessões, aplicação, backfill, restauração ou deploy.
