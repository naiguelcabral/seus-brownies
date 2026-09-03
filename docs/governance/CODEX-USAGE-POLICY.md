# Política de uso e reserva do Codex — Cacau v1

## Objetivo

Evitar que uma tarefa longa consuma toda a franquia disponível do Codex e termine sem documentação, checkpoint ou contexto suficiente para retomada segura.

## Fonte oficial do estado de uso

O agente não deve estimar consumo por quantidade de mensagens, tamanho de diff ou tokens aparentes da conversa.

Quando o produto expuser o estado de uso, consultar a fonte oficial disponível:

- Codex CLI: `/status`;
- Codex Desktop/Web: `Settings → Usage` / painel de uso;
- utilizar o percentual/saldo e o horário de reset exibidos pela própria conta.

O horário de reset nunca deve ser fixado manualmente neste repositório, pois pode variar conforme janela de uso, plano, redefinições e conta.

## Reserva obrigatória de 5%

O projeto adota **5% de uso restante como reserva operacional**.

Quando a franquia relevante exibida pelo Codex atingir **5% restante ou menos**:

1. não iniciar nova tarefa;
2. interromper a expansão do escopo atual no primeiro ponto consistente e reversível;
3. preservar arquivos já corretos;
4. executar somente verificações curtas indispensáveis para não deixar estado inconsistente, se houver cota suficiente;
5. atualizar o roadmap/status da tarefa para refletir o estado real;
6. criar ou atualizar um handoff de retomada contendo:
   - tarefa atual;
   - o que foi concluído;
   - arquivos alterados;
   - testes executados e resultados;
   - testes ainda não executados;
   - pendências;
   - próximo passo exato;
   - riscos/gates humanos;
   - percentual/saldo de uso mostrado pelo Codex;
   - horário de reset mostrado pelo Codex;
7. confirmar que a branch atual é uma branch de trabalho e não `main`;
8. executar `./DESLIGARTUDO` como checkpoint oficial de encerramento;
9. confirmar no resultado do script que o trabalho foi salvo/sincronizado, ou registrar claramente qualquer falha de commit, rebase ou push;
10. informar ao usuário que o trabalho foi pausado por reserva de capacidade e qual horário de reset foi exibido.

A reserva de 5% não deve ser consumida para iniciar implementação adicional. Ela existe para fechamento seguro, handoff e execução do `DESLIGARTUDO`.

## Uso do `DESLIGARTUDO`

O script é o mecanismo oficial de encerramento do dispositivo/projeto:

- em uso manual, pergunta `Salvar e sincronizar o trabalho antes de desligar? [S/n]`;
- em execução não interativa pelo Codex, usa a mensagem padrão de checkpoint;
- cria commit quando houver mudanças;
- executa `git pull --rebase` da branch atual;
- executa `git push` da branch atual;
- possui defesa contra arquivos `.env*` conhecidos versionados;
- execução automática na `main` é bloqueada.

O Codex só pode usá-lo automaticamente no fechamento da reserva de 5% ou quando uma tarefa explicitamente autorizada exigir encerramento seguro. Não usá-lo no meio de uma implementação apenas para criar commits intermediários.

Se `DESLIGARTUDO` falhar:

- não esconder a falha;
- não forçar push;
- não trocar para `main`;
- registrar o erro no handoff;
- preservar o estado local e aguardar nova execução/decisão quando necessário.

## Retomada após renovação

A retomada deve ocorrer **somente no horário de reset exibido pelo Codex ou depois dele**, após confirmar que a franquia relevante foi renovada.

O estado ideal de retomada é **100% da nova janela de capacidade** quando o produto assim o exibir. Se o produto renovar para outro indicador/cota sem mostrar exatamente `100%`, utilizar o estado real informado e não inventar percentual.

Antes de retomar:

1. consultar novamente `/status` ou `Settings → Usage`;
2. confirmar que a janela relevante foi renovada;
3. registrar o novo percentual/saldo disponível;
4. confirmar a branch de trabalho correta e o `git status`;
5. executar `./LIGARTUDO` como procedimento oficial de retomada;
6. confirmar que a atualização Git ocorreu por fast-forward ou foi adiada de
   forma segura por alterações locais;
7. confirmar que Node.js, npm e as dependências estão disponíveis;
8. ler o handoff mais recente;
9. reler `AGENTS.md` e a governança aplicável;
10. continuar exatamente do próximo passo documentado, sem repetir operações
    já concluídas.

`./LIGARTUDO` nunca substitui aprovação humana, não deve ser usado para
descartar alterações locais e não pode ser usado para alterar automaticamente a
`main`. `./DESLIGARTUDO` continua sendo o procedimento oficial de encerramento.

## Retorno automático x manual

Esta política define **quando parar e quando é seguro retomar**, mas um arquivo do repositório não consegue acordar sozinho uma sessão encerrada.

- Se houver uma **Automation do Codex** configurada para a tarefa, ela poderá ser usada para iniciar nova execução após o reset, respeitando esta política.
- Sem Automation, a retomada depende de nova execução iniciada pelo usuário/Codex após o horário de reset.
- Nunca simular que existe uma retomada agendada quando nenhuma Automation estiver configurada.

## Exibição do consumo

Em tarefas longas, o agente deve incluir nos checkpoints, sempre que esse dado estiver disponível pelo produto:

```text
Uso Codex
- restante: XX%
- reserva do projeto: 5%
- reset exibido: AAAA-MM-DD HH:MM TZ
- estado: trabalhando | encerrando | pausado por reserva | retomado
```

Quando retomar após o reset:

```text
Uso Codex
- capacidade após reset: XX% (idealmente 100%, se assim exibido)
- reset confirmado: sim
- checkpoint restaurado: sim
- estado: retomado
```

Se o produto não expuser um percentual exato, registrar o indicador que ele realmente fornecer, sem inventar conversão para percentual.

## Falha de consulta

Se não for possível obter o estado de uso:

- não inventar percentual;
- informar `uso: não disponível para esta execução`;
- seguir tarefas pequenas e com checkpoints frequentes;
- ao aparecer aviso de limite, concluir imediatamente o handoff seguro e, em branch de trabalho, executar `./DESLIGARTUDO` se houver capacidade suficiente.

## Prioridade sobre produtividade

Preservar integridade de Git, banco, estoque, dinheiro, FIFO/CMV e documentação tem prioridade sobre aproveitar os últimos pontos de franquia.
