# Revisão dos alertas de dependências — 28/10/2026

## Resultado e escopo

Solicitação: verificar os alertas encontrados durante a preparação do piloto.
Dez pacotes sinalizados na auditoria online anterior correspondem a quatro
advisories de origem; os demais registros propagam o efeito da dependência.
A candidata local remove os dez alertas sem trocar framework, SDK Neon,
provedor de identidade, schema, regras de negócio ou configuração remota.
Não houve exploração de vulnerabilidades, teste com credencial de pessoa,
mudança de contas, SQL de escrita, merge ou publicação.

O piloto foi relido na API Cloudflare: deployment
`ce3253c6-915f-4f5a-afdd-aa12506eb139`, versão
`0cdcdb1d-3d89-4b0b-972c-51f79806c76f`, 100%, desde
27/10/2026 15:08:35 UTC. O lockfile da fonte publicada `2cd8ff6` contém
`better-auth`/adapter Drizzle 1.7.6, renderer 2.0.6 e deepmerge 4.3.1.
A correção descrita aqui é candidata; não está no ambiente publicado.

## Alertas e aplicabilidade

| Advisory / gravidade de origem | Condição relevante | Evidência e limite | Candidata local |
| --- | --- | --- | --- |
| [GHSA-965c-763c-88jm](https://github.com/advisories/GHSA-965c-763c-88jm), crítico | Magic Link + OAuth e configuração de tokens/estado descrita pelo fornecedor | Leitura dos plugins no piloto e no Auth do HML anterior confirmou `magic_link.enabled=false`; uma condição necessária está ausente. Google compartilhado existe nos dois destinos. Isso não comprova a versão do servidor gerenciado nem autoriza habilitar Magic Link. | Better Auth 1.7.10, acima da primeira versão corrigida 1.7.7. |
| [GHSA-r4xp-prcw-77qf](https://github.com/advisories/GHSA-r4xp-prcw-77qf), alto | OAuth Proxy, estado em cookie e segredo compartilhado inadequadamente | Cacau usa o proxy do SDK para Neon Auth, sem servidor Better Auth próprio configurado no código. A configuração interna do OAuth Proxy no provedor não foi atestada. `oauth_provider.enabled=false` é outro plugin e **não** prova ausência de OAuth Proxy. Segredos não foram lidos. | Better Auth e integrações da linha 1.7.10. |
| [GHSA-44jh-23m7-hpcf](https://github.com/advisories/GHSA-44jh-23m7-hpcf), baixo | Rate limiting persistido em PostgreSQL por adapter afetado | Adapter Drizzle instalado era 1.7.6; a implementação interna do limitador do provedor não foi comprovada. Controles próprios do Cacau não são prova de correção do servidor gerenciado. | Adapter Drizzle 1.7.10 e demais adapters da mesma linha. |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), baixo | Entrada controlada por atacante em `deepmerge.mergeObject` | `deepmerge@4.3.1` chega pelo renderer transitivo da UI Neon. O advisory não lista versão corrigida desse pacote. Não foi demonstrada exploração pelo fluxo do Cacau. | Renderer 2.2.0 usa html-to-text 10.0.1/deepmerge-ts; `deepmerge` removido. |

Não se deve contar a presença do pacote como prova de exploração. Também não
se deve tratar ausência de uma condição como correção da versão instalada.
O SDK local e o servidor Neon gerenciado têm ciclos distintos: o override
não atualiza o serviço de identidade remoto.

## Mudança preparada

- Overrides Better Auth/core/passkey/API Key em 1.7.10, mantendo a versão
  `@neondatabase/neon-js@0.8.0-beta`. Adapters/telemetria resolvem a mesma linha.
  A versão 1.7.10 também satisfaz o peer do plugin API Key que já estava no
  lockfile; evita introduzir atualização do SDK beta como correção presumida.
- `better-call` 1.4.2 no ramo da UI Neon para compatibilidade com core/passkey;
  o ramo independente da UI Daveyplate conserva sua versão 2.0.2.
- Renderer de e-mails 2.2.0. A atualização interna html-to-text 9→10 foi
  revisada com requisito Node compatível com Node 22 e teste de HTML escapado,
  texto legível e preservação de link. Nenhum componente de UI externo novo
  foi incluído na aplicação.
- Regressão exige versões mínimas corrigidas, coordenação dos pacotes Auth e
  ausência da cadeia sem patch. O teste do renderer resolve a dependência a
  partir do pacote proprietário; não adiciona dependência direta artificial
  nem altera a baseline Knip.

Uma tentativa de deduplicar o lockfile trouxe alterações sem relação e não
resolveu o peer herdado; foi descartada e a candidata regenerada sobre o
lockfile original. Não houve `audit fix --force`, downgrade da UI ou remoção
de teste para obter aprovação.

## Verificação e limites remanescentes

Auditoria online da candidata: zero alertas. 640 testes Node passaram, sem
falhas/ignorados. Build isolado do piloto aprovado em `949c35e`, com chave
pública de teste, ambiente limpo e archive do HEAD, sem deploy. Os avisos de
sourcemap CSS e tempos dos plugins continuam visíveis, sem erro de build.
Checks de lint, tipos e formato já aprovados; Knip mantém quatro achados
contextuais, zero novos. Não há alteração de lógica operacional.

A execução de testes dentro da sandbox encontrou falhas nos contratos que
iniciam subprocessos; a suíte integral foi repetida fora dela e passou. O
teste novo usa a cadeia de resolução do pacote proprietário, sem incluir
entrada nova na baseline para esconder dependência não listada.

`npm ls` ainda acusa um peer transitivo herdado: a UI Daveyplate 3.4.0 traz
`better-call@2.0.2`, enquanto seu plugin API Key pede 1.4.2. A candidata
corrige a divergência Better Auth 1.7.6/core/plugin 1.7.10, mas não rebaixa a
UI para esconder o conflito restante. Esse plugin não é importado pelo código
da aplicação; a incompatibilidade de metadados permanece registrada para
correção upstream. Não confundir auditoria zero com grafo sem avisos.

GitHub CodeQL: zero alertas abertos na consulta anterior à candidata. O
primeiro CI apontou o alerta 14, `js/incomplete-url-substring-sanitization`,
na asserção do novo teste que procurava uma URL como substring. Esse código
não sanitiza entrada de usuário: a fixture e a expectativa são constantes.
A asserção foi tornada mais estrita, comparando o texto final inteiro,
incluindo a URL. Nenhuma regra foi ignorada ou alerta dispensado. Em
`e07454c`, os doze checks passaram; as três análises da candidata de merge
`221ad2ae` retornaram zero resultados/erros/avisos, e a consulta dos alertas
abertos dessa PR retornou zero. As seis regressões de dependências passaram
também após a asserção mais estrita. Os demais onze checks já tinham passado
no primeiro HEAD. A API de Dependabot respondeu
HTTP 403 informando alertas desativados; não foram ativados nem ampliados os
escopos do token. Atualizações Dependabot existentes não provam que o serviço
de alertas de vulnerabilidade esteja ativo. A auditoria npm online é evidência
independente. Recibo documental posterior preserva a mesma árvore de código,
dependências e testes; reconferir seus checks no [HEAD da PR #89](https://github.com/naiguelcabral/seus-brownies/pull/89).

Gates restantes: revisão humana da correção concreta antes de merge e
publicação; confirmar versão/configuração interna do Auth gerenciado quando
necessário para encerrar os vetores do provedor. Não reabrir a sessão real,
resetar pessoas ou habilitar plugins para reproduzir ataques. I04 e os aceites
do piloto permanecem separados. As compras anteriores e a preparação da
produção na PR #88 não foram alteradas.

[Recibo sanitizado](../../evidence/security-alert-review-2026-10-28.json).

## Integração autorizada

Após apresentação da candidata validada, o usuário autorizou “Pode seguir
a próxima etapa”. PR #89 reconferida em `0d90bdb`, com doze checks aprovados,
três análises da candidata `e4bdb857` sem resultados/erros/avisos e zero
alertas abertos na PR. Integração normal, sem bypass, às 23:15:24 UTC de
28/10/2026: merge `4dc504b89df847eaccb8e56159e70a8f64b49a05`.

O diff entre a árvore aprovada e a main integrada é vazio. Workflows do merge:

- [CI e build isolado da main](https://github.com/naiguelcabral/seus-brownies/actions/runs/40786054761): sucesso.
- [Negócio/navegador conectado](https://github.com/naiguelcabral/seus-brownies/actions/runs/40786054843): sucesso.
- [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/40786054736): sucesso; três análises reais desse merge com zero resultados/erros/avisos e consulta de alertas abertos da main retornando zero.

Este fechamento documental não altera pacote, teste ou configuração; links,
JSON e diff são as verificações locais aplicáveis. Audit zero e 640 testes
continuam sendo evidência da candidata, com nova CI da main como validação
do merge. Publicação no piloto ainda não executada; nenhuma escrita de
negócio, alteração de Auth, secrets, DNS ou produção. Os limites do provedor,
o peer herdado e o estado de Dependabot permanecem conforme a revisão acima.
