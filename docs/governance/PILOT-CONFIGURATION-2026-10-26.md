# Configuração Auth e piloto — 26/10/2026

Usuário autorizou **“Pode configurar”**, após apresentação da candidata e da necessidade de Auth e ambiente isolado publicado. #77 integrada em `c6ff2b6` após reconferir 12 checks e CodeQL do HEAD `d668be7`. Não libera produção, expurgo, mudança de RPO/RTO/retenção ou fatos operacionais presumidos.

Operacional do piloto: `cacau-pilot-operations-20261026/br-blue-shadow-ackpk8ex`, cópia de `br-lingering-wind-acwh5wap`. Auth: `cacau-pilot-auth-20261026/br-orange-shadow-acp4523g`, cópia de `br-patient-lake-ac2t0cvq`. As originais conservam sua classificação e fatos. Compute mínimo 0,25 CU; a conta recusou definir intervalo de suspensão e foi mantida a política padrão, sem mudança de plano. Sem expiração automática.

Proposta SQL do diretório aplicada em transação nos dois Auth. Role `cacau_auth_directory` ativada com credencial nova em memória; seis colunas e função de reset conferidas, leitura de user completo/account/verification e escrita negadas. Secret `AUTH_DIRECTORY_DATABASE_URL` gravado nos Workers correspondentes sem exposição de valor ou arquivo de ambiente.

Piloto usa role própria `cacau_pilot_app`, DML em public e uso de sequências, sem propriedade/administração/DDL. CREATE em public e leitura de drizzle negados. Matriz mais granular de writers continua em L02. Seis secrets próprios configurados no Worker `cacau-v1-piloto`, com cookie secret e pepper novos e destinos das cópias.

Widget Turnstile próprio: site key pública `0x4AAAAAAFm9r4Dfh7tXmljE`, somente hostname `cacau-v1-piloto.naiguelcabral.workers.dev`. Secret validado com token fictício (invalid-input-response, sem invalid-input-secret), recebido sem eco e gravado sem arquivo. Token real/replay permanecem pendentes. Origem HTTPS adicionada à whitelist do Auth copiado; whitelist original preservada.

`env.pilot` tem callback e namespaces próprios. Build `scripts/build-pilot-isolated.sh` usa archive do HEAD limpo e ambiente vazio, com chave pública explícita e faixa de teste. `PILOT_DEPLOY=1` publica somente esse alvo, com autorização recebida. Enquanto a aplicação não for publicada, o Worker reservado responde 503.

Estado: recursos aplicados; concluir testes/CI, publicação, readback e smoke antes de liberar a URL. HML não recebeu a nova aplicação. Serviços Auth reais, OTP/desafio/senha e aceite ficam com a pessoa. Não houve escrita de novos fatos de compra/produção/venda na origem. O piloto começa com um retrato dos fatos existentes; não autoriza duplicar notas já representadas.

[Roteiro e recibo](RECOVERY-PILOT-PROPOSAL-2026-10-26.md).
