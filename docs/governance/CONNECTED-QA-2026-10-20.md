# Validação conectada e sustentação — 20/10/2026

## Checkpoint final de código

Publicado `bb76764` no HML: versão `22733c04-7996-43b1-88e3-3f775db223fc`,
100% desde21/10 00:10:17 UTC (20/10 21:10 Brasília). Deployments relidos;
raiz307/login200. Sem SQL compartilhado, secrets alterados ou merge.

Código `bb76764`: dez casos passaram juntos em1,3min pelo wrapper de HEAD
arquivado/ambiente limpo. Todos os jobs remotos passaram, inclusive o novo
`connected-postgres-browser`: CI39519039630, negócio/browser39519039633,
migrations39519039669, evidência39519039646 e CodeQL39519039641.
Análises1992888500/1992887454/1992886788 têm zero resultados, sem erro/aviso;
zero alertas abertos. Build HML isolado passou. Quatro containers da tarefa
encerrados/removidos; backups locais/Drive preservados. Recibo sanitizado em
`evidence/connected-qa-2026-10-20.json`. Checkpoints intermediários abaixo
preservam a descoberta/correção, sem substituir o resultado final.

Evidência; o acompanhamento permanece exclusivamente no ROADMAP-CODEX.md.

## Laboratório

`npm run test:e2e:connected` arquiva HEAD limpo, limpa o ambiente do processo
e exige PostgreSQL17 vazio em127.0.0.1:5440, ator/database fixos. Não apaga
bancos para repetir. Vite local4178 ignora arquivos locais de ambiente e usa
aliases exclusivos de QA para conexão e identidade sintéticas. Middleware,
CSRF, validação, handlers, writers e telas são reais; papéis/atividade vêm
de `app_user_access` a cada chamada. Nenhum alias/bypass no build publicado.
Browser restrito à origem local; WebSockets, trace, vídeo e screenshots
automáticos desativados. Bridge expõe apenas as55 Server Functions compiladas.
Knip mapeia entradas reais/caminho Vite, sem alterar a baseline.

Sete casos passaram desde banco vazio e três complementares passaram em
seguida. CI repetirá os dez em um único laboratório vazio. Cobertura:

- Dono/Gerente/Produção/Funcionário: todas as chamadas proibidas entre55
  políticas negadas e contagens preservadas; operações permitidas registram
  os quatro atores sintéticos. Anônimo, inativo, não verificado e sem vínculo
  negados. Revogação vale na próxima chamada, sem trocar cookie.
- Interface390×844: compra1kg/R$12,50, consumo250g, lote12un, venda2un/R$20,
  Pix/R$0,49, entrega e lucroR$18,99. Custo25/8 e CMV25/48 exatos.
  Download CSV conferido por nome/conteúdo; relatório sem overflow horizontal.
- Segunda conclusão negada; cancelamento pré-entrega restaura sua baixa sem
  duplicação. Devolução pós-entrega não retorna alimento vendável. CréditoR$10,
  resgateR$4/saldoR$6, replay, reembolso e tarifa original preservados.
  Fechamento bloqueia despesa; Dono registra fato compensatório de correção.
- Dois runners anteriores de negócio/custos e559 testes Node passaram;
  lint/tipos/formato e Knip sem novos achados aprovados. Knip no sandbox falhou
  na execução; repetição autorizada fora da restrição passou.

## Correção descoberta

Relatório contra fatos válidos retornava “Valor do estoque inconsistente”.
SELECT não ordenava a razão, e o cálculo sequencial podia receber saída antes
da entrada. Adicionado ORDER BY `occurred_at,id`. O mesmo conjunto e CSV
passaram; contrato protege a ordenação. Correção somente leitura, sem mudança
de custo, regra financeira, migration ou backfill. CI/CodeQL e publicação da
candidata continuam pendentes neste checkpoint.

## Backup e alertas

Usuário escolheu Google Drive privado e e-mail do Dono. Pasta `Cacau — Backups
privados` criada sem compartilhamento. Dump e manifesto enviados, metadata de
parent/proprietário/tamanho224555 bytes conferida. SHA-256 local:
`0bd53e39fb98df6b1edf2da4f191bc2dc0b0603ce334e68fe787204ce55126e6`.
Origem previamente autorizada: original `br-lingering-wind-acwh5wap`, somente
public/drizzle em leitura, Auth gerenciado excluído. Endereço pessoal e
IDs/URLs privados do Drive não são versionados.

Restore local do arquivo correspondente passou38 tabelas/36 recibos. Primeira
tentativa parou porque `public` já existia no container vazio; helper omite
somente esse CREATE SCHEMA da TOC e conserva todos os objetos/dados, sem DROP.
O conector retornou referência de download; os bytes externos não foram
materializados/restaurados. Esse gate não está concluído.

Automações locais ativas: `cacau-disponibilidade-hml` (hora em hora) e
`cacau-backup-di-rio-privado` (03:00 America/Sao_Paulo). Monitor confirma falha,
alerta incidente/recuperação e limita lembretes a seis horas; backup confere
privacidade/tamanho e alerta falha. Gmail confirmou envio/recebimento do teste
na própria conta conectada. Execuções futuras/incidente real não observados.
Computador/app/conectores precisam estar disponíveis; não é serviço24×7.
Sem expurgo de cópias. Retenção, RPO/RTO e restore externo completo pendentes.

## Gates preservados

`db:prepare` passou sem habilitar execução. Original continua classificada
como produção, recusada pela revisão genérica. Não reaplicar36 recibos nem
usar fixture como prova de alvo compartilhado. Incremento não requer SQL;
aplicação futura exige classificação/vínculo independente, plano e autorização.
Main exige revisão/checks finais. Celular físico e serviço gerenciado de
Neon/Turnstile exigem aceite próprio; laboratório não os substitui.
