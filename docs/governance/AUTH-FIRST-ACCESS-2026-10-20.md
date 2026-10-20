# Primeiro acesso e recadastro — 20/10/2026

## Diagnóstico e limites

O usuário confirmou a entrada de Funcionário, da Gerente nova e da conta
gerencial anterior. A matriz completa de permissões H03 ainda não foi aceita.

A conta da Gerente foi criada administrativamente antes do cadastro pela
interface. O cadastro de um e-mail existente não substitui a senha anterior,
mas o Cacau continua solicitando OTP e mantém a resposta opaca para evitar
enumeração. A confirmação do e-mail não significa que a senha do recadastro
foi aplicada. A interface anterior deixava a pessoa na etapa OTP, sem caminho
claro para login ou definição de senha de uma conta preparada pela equipe.

O comportamento foi reproduzido com Better Auth instalado e adapter em
memória, sem rede, banco compartilhado ou credenciais reais:

- recadastro + OTP preservam a senha existente e recusam a senha candidata;
- recuperação pessoal permite entrar com a senha nova;
- cadastro realmente novo + OTP permitem entrar com a senha inicial.

Isso identifica uma falha na orientação de primeiro acesso. Não comprova
defeito de hash nem a mesma causa nas tentativas da conta gerencial anterior.
O laboratório local não representa uma execução no serviço gerenciado Neon.

## Correção e procedimento

Código `b0680dd`: primeiro acesso/recuperação disponível no login, cadastro e
OTP; explicação de que recadastro não altera senha; retorno ao login após OTP
com e-mail preservado e campos de senha/código limpos. A resposta de cadastro
continua igual para conta nova e existente. Os controles do servidor continuam
aplicados.

Para novos acessos, escolher um fluxo coerente: cadastro pela própria pessoa
para escolher a senha inicial, ou conta preparada administrativamente seguida
de definição pessoal de senha pelo link de recuperação. Não orientar recadastro
como forma de substituir a senha de uma identidade já existente.

## Validação e publicação

Passaram 556 testes Node, lint, tipos, formato, Knip sem novas ocorrências,
build HML isolado, 39 casos de navegador (quatro novos) e smoke público local.
As fixtures usam a tela real com serviços simulados e rede restrita a loopback.
As tentativas iniciais limitadas pelo sandbox/subprocessos e pelo caminho do
Chromium foram repetidas com os recursos locais adequados, sem afrouxar testes.

Checks remotos do commit passaram, inclusive os jobs CodeQL. A consulta
detalhada aos resultados/alertas CodeQL foi interrompida; essa triagem e a
publicação HML permanecem pendentes. HML continua no código `3f0ba59`.
Nenhum deploy, alteração de senha, configuração Auth ou fato de negócio ocorreu
durante esta correção. PRs #47/#48 continuam em rascunho, sem merge.
