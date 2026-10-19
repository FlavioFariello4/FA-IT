# FA IT

Sito Next.js in italiano per il progetto digitale FA IT. Il nome e il dominio sono
provvisori: aggiorna `NEXT_PUBLIC_SITE_URL`, i metadati e i profili social prima del lancio.

## Avvio locale

```bash
npm install
npm run dev
```

Apri <http://localhost:3000>. Senza Supabase le pagine pubbliche sono consultabili, mentre
i moduli mostrano chiaramente che non sono ancora attivi e l'area riservata richiede la
configurazione del backend.

## Backend, accessi e CV

Il backend usa Supabase Auth, PostgreSQL e Storage privato. Per attivarlo:

1. Crea un progetto Supabase, configura l'autenticazione email/password e verifica in Resend
   il dominio mittente usato per gli inviti del team.
2. Applica `supabase/migrations/20261017000000_initial_schema.sql` al database.
   Applica poi `supabase/migrations/20261017140000_admin_workflows.sql` per aggiungere gli
   stati di candidature e richieste e `supabase/migrations/20261017160000_support_role.sql`
   per abilitare il ruolo Supporto e `supabase/migrations/20261017170000_support_inbox.sql`
   per la inbox, le assegnazioni e le risposte email. Infine applica
   `supabase/migrations/20261017180000_support_conversation_threads.sql` per le conversazioni
   email in entrata e in uscita, poi `supabase/migrations/20261019100000_portfolio_project_images.sql`
   per la galleria foto del portfolio. Su un database già esistente, applica solo le
   migration non ancora eseguite.
3. Copia `.env.example` in `.env.local` e inserisci URL e chiave anonima del progetto.
   La chiave `SUPABASE_SERVICE_ROLE_KEY` va mantenuta solo sul server: non anteporre
   `NEXT_PUBLIC_` e non inserirla mai nel browser o nel repository.
4. Imposta il dominio canonico del sito come `NEXT_PUBLIC_SITE_URL` e `SITE_URL`
   (ad esempio `https://www.fa-it.it`). In Supabase Auth imposta lo stesso **Site URL** e
   aggiungi `https://www.fa-it.it/**` agli URL di redirect consentiti.
5. Assegna il ruolo iniziale `admin` al tuo utente autenticato dal pannello SQL di
   Supabase. Non esiste un account amministratore predefinito.
6. Completa l'informativa, i recapiti del titolare e i tempi di conservazione prima di
   attivare i moduli. Le candidature salvano i CV in un bucket privato; HR e admin possono
   generare un link firmato che scade dopo due minuti.
7. Imposta `PUBLIC_FORMS_ENABLED=true` solo dopo aver verificato informativa, retention,
   storage e accessi. Il valore predefinito è `false`; i moduli restano disattivati.

Esempio per assegnare il primo admin (dopo aver creato l'utente in Supabase Auth):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'tuo-indirizzo@example.it'
on conflict do nothing;
```

Disabilita la registrazione pubblica di account in Supabase: il team si gestisce tramite
invito. Attiva MFA per gli account privilegiati. Gli inviti vengono creati da Supabase Auth
e spediti da Resend con `RESEND_API_KEY` e il mittente verificato `SUPPORT_EMAIL_FROM`.

### Template email Supabase

Sono disponibili template HTML responsive, con colori e stile del sito, in
[`supabase/templates/`](./supabase/templates/). Nel pannello Supabase apri
**Authentication → Email Templates**, seleziona il tipo di email, incolla il contenuto del
file corrispondente in **Message Body** e imposta l'oggetto:

| Tipo in Supabase | File | Oggetto consigliato |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | Conferma il tuo indirizzo email · FA IT |
| Invite user | `invite-user.html` | Hai ricevuto un invito nel team FA IT |
| Magic Link | `magic-link.html` | Il tuo link di accesso a FA IT |
| Change Email Address | `change-email-address.html` | Conferma il nuovo indirizzo email · FA IT |
| Reset Password | `reset-password.html` | Reimposta la password · FA IT |
| Reauthentication | `reauthentication.html` | Il tuo codice di verifica · FA IT |

I template usano le variabili standard di Supabase (`{{ .ConfirmationURL }}`,
`{{ .SiteURL }}` e, per la riautenticazione, `{{ .Token }}`): non sostituirle con URL o
codici statici. Nota: al momento gli inviti del team vengono consegnati direttamente tramite
Resend dall'endpoint applicativo, quindi il template **Invite user** non viene usato per
quegli inviti; è pronto per l'eventuale flusso in cui Supabase invia direttamente le email.

### Ruoli predefiniti

- `admin`: gestione completa, richieste clienti, accessi e tutti i contenuti.
- `portfolio_editor`: creazione e pubblicazione dei progetti.
- `hr_manager`: gestione offerte e lettura delle candidature/CV.
- `support`: può consultare e cercare tutte le richieste, rispondere e aggiornare lo stato
  solo delle richieste assegnate; non gestisce utenti, candidature o altri contenuti.

Le verifiche sono applicate sia nell'interfaccia sia tramite Row Level Security in
PostgreSQL. Puoi invitare persone e assegnare/revocare ruoli da **Area riservata → Persone**.
Non assegnare `admin` a collaboratori che devono gestire solo portfolio o selezione.

### Come circolano i dati

Il browser usa Supabase Auth per l'accesso e invia le richieste al server Next.js. Il server
controlla sessione e ruoli, poi interagisce con PostgreSQL e lo Storage privato tramite
Supabase. La service-role key resta solo sul server e non deve mai essere esposta al browser.
Render (o il futuro container Docker) ospita l'applicazione; Supabase resta il servizio
separato per autenticazione, database e CV.

### Organizzazione del backend nel codice

- `src/lib/supabase-*.ts` crea client distinti per browser, pagine server, API privilegiate
  e letture pubbliche; la chiave service-role è confinata al client admin server-side.
- `src/lib/backend/http.ts` centralizza i controlli HTTP e la validazione condivisa delle
  API; `admin-api.ts` protegge le operazioni amministrative e verifica sessione e ruolo.
- `src/lib/staff-access.ts` controlla i ruoli per le pagine riservate.
- `src/app/api/` contiene gli endpoint: i moduli pubblici validano e salvano richieste/CV,
  mentre `/api/admin/users` gestisce inviti e ruoli.
- `supabase/migrations/` contiene schema, permessi RLS e policy Storage; le autorizzazioni
  del database rimangono la protezione effettiva anche quando l'interfaccia non mostra una
  funzione.

### Gestione dal pannello

In **Area riservata** trovi le sezioni disponibili per il tuo ruolo:

- **Portfolio:** crea, modifica, pubblica, nascondi o elimina progetti; aggiunge fino a
  12 immagini JPG, PNG, WebP o AVIF (massimo 10 MB ciascuna) e può rimuoverle. Le immagini
  sono salvate in un bucket privato e mostrate solo per i progetti pubblicati.
- **Offerte di lavoro:** crea e modifica gli annunci, pubblicali o lasciali in bozza.
- **Candidature:** aggiorna la fase (nuova, in valutazione, colloquio, scartata, selezionata);
  l'eliminazione richiede conferma e rimuove sia la scheda sia il CV privato.
- **Richieste clienti:** assegnazione automatica a rotazione tra gli account con ruolo
  `support`; ricerca per nome, email e testo, filtro “Assegnate a me”, storico delle risposte
  e conversazione email bidirezionale tramite Resend. Tutti i support possono vedere tutte
  le conversazioni; possono rispondere e cambiare lo stato solo sulle richieste assegnate a
  loro. L'admin può gestire tutto.

Gli stati di candidature e richieste richiedono la migration
`20261017140000_admin_workflows.sql`; assegnazione round-robin e storico risposte richiedono
`20261017170000_support_inbox.sql`; le conversazioni bidirezionali richiedono anche
`20261017180000_support_conversation_threads.sql`. Applica le migration mancanti in Supabase
prima di usare la inbox. Configura su Render `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` e
`SUPPORT_EMAIL_REPLY_DOMAIN=inbound.fa-it.it`; `SUPPORT_EMAIL_FROM` è facoltativa (predefinito:
`FA IT Support <support@fa-it.it>`). Verifica il dominio mittente e abilita la ricezione
email in Resend; la verifica del dominio su Sender.net non verifica automaticamente il
dominio in Resend.

Per non toccare i record MX della posta esistente, configura in Resend un dominio di ricezione
dedicato, `inbound.fa-it.it`, aggiungi in Register.it solo i record DNS/MX indicati da Resend
per quel sottodominio e crea un webhook `email.received` verso
`https://<dominio-del-sito>/api/webhooks/resend/inbound`. Copia il signing secret del webhook
in `RESEND_WEBHOOK_SECRET`. Il mittente resta sempre `support@fa-it.it`; l'indirizzo Reply-To
usa un alias univoco sul sottodominio per associare in modo affidabile ogni risposta alla
conversazione corretta. Il mittente delle email in ingresso deve corrispondere all'indirizzo
usato dal cliente nella richiesta. Le email già inviate prima di questa configurazione non
hanno un alias di conversazione e le loro eventuali risposte non verranno associate
automaticamente.

## SEO e pubblicazione

Il progetto include metadata per pagina, Open Graph, immagine social generata, dati
strutturati `WebSite`, `sitemap.xml` e `robots.txt`. Prima del lancio:

- usa un dominio definitivo e coerente in `NEXT_PUBLIC_SITE_URL`, Vercel/hosting e Supabase;
- verifica proprietà del dominio in Google Search Console e Bing Webmaster Tools, invia
  `https://<dominio>/sitemap.xml` e controlla indicizzazione e copertura;
- pubblica casi studio originali, descrizioni specifiche dei servizi e contenuti utili
  basati sulle domande reali dei clienti; evita testi generici e pagine locali duplicate;
- aggiungi indirizzo, dati aziendali e Google Business Profile solo quando esistono e se
  l'attività soddisfa i requisiti; non inventare una sede o una società già costituita;
- inserisci link social reali e coerenti, ottimizza le immagini che aggiungerai e monitora
  Core Web Vitals, accessibilità e query di ricerca;
- aggiorna l'informativa legale e le preferenze prima di installare analytics o pixel.

Nessun intervento può garantire la prima posizione: il ranking dipende anche da concorrenza,
autorevolezza, area geografica, qualità e continuità dei contenuti e collegamenti esterni.

## Deploy su Render

Per Render puoi collegare il repository e creare un **Web Service**:

- **Runtime Node (consigliato per il primo deploy):** Build Command `npm ci && npm run build`;
  Start Command `npm run start`; imposta `NODE_VERSION=22` e le variabili presenti in
  `.env.example` nella dashboard. Le variabili `NEXT_PUBLIC_*` vanno configurate anche al
  build, perché possono essere incorporate nei bundle client e nei metadata generati.
- **Docker:** seleziona Docker come runtime e imposta `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` come build args. Le variabili
  server-only, inclusa `SUPABASE_SERVICE_ROLE_KEY`, vanno impostate nell'ambiente del servizio
  e non come build args. Render assegna `PORT`; il container ascolta su `0.0.0.0`.

Collega il dominio nel pannello Render e configura lo stesso URL in `NEXT_PUBLIC_SITE_URL` e
`SITE_URL`, oltre ad aggiungerlo agli URL consentiti di Supabase Auth. `SITE_URL` è letto
server-side al momento dell’invito; `NEXT_PUBLIC_SITE_URL` va impostato anche al build, perché
Next.js può incorporarlo nei bundle. Per gli inviti si usa prima `SITE_URL`, poi l'origine
validata della richiesta e infine `NEXT_PUBLIC_SITE_URL`; un eventuale hostname
`*.onrender.com` non viene usato come destinazione. Se Resend non restituisce un esito
verificabile, l'account invitato viene mantenuto per evitare di invalidare un link che
potrebbe essere già stato spedito: controlla il log Resend prima di intervenire. I dati
persistenti risiedono su Supabase, non nel
filesystem effimero del servizio web.

Gli inviti del team sono inviati tramite Resend dal dominio verificato. Per ridurre la
possibilità che finiscano nello spam, verifica su Resend la firma del dominio mittente e
pubblica correttamente i record SPF, DKIM e DMARC; la consegna e la reputazione dipendono
anche dal provider del destinatario e non possono essere garantite solo dal codice.

## Deploy Docker locale

```bash
docker build `
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.it `
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co `
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key `
  -t fa-it .
docker run --rm -p 3000:3000 `
  -e SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key `
  -e PUBLIC_FORMS_ENABLED=false `
  fa-it
```

In PowerShell, il carattere backtick continua il comando sulla riga successiva. In produzione
fornisci i segreti tramite il secret manager dell'host, mai nell'immagine o nel repository.

## Prima del lancio pubblico

- Completa e fai verificare da un professionista l'informativa privacy/cookie: oggi è una
  bozza e segnala volutamente i dati mancanti del titolare e la retention ancora da definire.
- Configura un limite di frequenza e protezione anti-spam per i moduli pubblici; il controllo
  honeypot e il controllo dell'origine sono solo misure di base.
- Verifica le impostazioni di backup e cancellazione periodica di candidature, messaggi e
  CV, e limita il personale autorizzato a consultare i dati.
- Collega un servizio email per notificare le nuove richieste, se desiderato; al momento
  restano consultabili nell'area riservata.
- Aggiorna nome, dominio e social quando saranno definitivi e sostituisci i testi provvisori.

## Comandi

```bash
npm run lint
npm run build
```
