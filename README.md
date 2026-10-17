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

1. Crea un progetto Supabase e configura l'autenticazione email/password e l'invio delle
   email di invito con SMTP.
2. Applica `supabase/migrations/20261017000000_initial_schema.sql` al database.
   Applica poi `supabase/migrations/20261017140000_admin_workflows.sql` per aggiungere gli
   stati di candidature e richieste e `supabase/migrations/20261017160000_support_role.sql`
   per abilitare il ruolo Supporto. Su un database già esistente, applica solo le migration
   non ancora eseguite.
3. Copia `.env.example` in `.env.local` e inserisci URL e chiave anonima del progetto.
   La chiave `SUPABASE_SERVICE_ROLE_KEY` va mantenuta solo sul server: non anteporre
   `NEXT_PUBLIC_` e non inserirla mai nel browser o nel repository.
4. Imposta il dominio reale come `NEXT_PUBLIC_SITE_URL` e abilita quel dominio negli URL
   consentiti di Supabase Auth.
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
invito. Attiva MFA per gli account privilegiati e configura SMTP per gli inviti.

### Ruoli predefiniti

- `admin`: gestione completa, richieste clienti, accessi e tutti i contenuti.
- `portfolio_editor`: creazione e pubblicazione dei progetti.
- `hr_manager`: gestione offerte e lettura delle candidature/CV.
- `support`: sola lettura delle richieste dei clienti; non può cambiare lo stato o gestire
  utenti, candidature e altri contenuti.

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

- **Portfolio:** crea, modifica, pubblica, nascondi o elimina progetti.
- **Offerte di lavoro:** crea e modifica gli annunci, pubblicali o lasciali in bozza.
- **Candidature:** aggiorna la fase (nuova, in valutazione, colloquio, scartata, selezionata);
  l'eliminazione richiede conferma e rimuove sia la scheda sia il CV privato.
- **Richieste clienti:** filtra per stato, rispondi via email e contrassegna come risposto o
  archivia un messaggio.

Gli stati delle candidature e delle richieste sono aggiunti dalla migration
`20261017140000_admin_workflows.sql`. Dopo averla eseguita su Supabase, ricarica il sito.
Le richieste dei clienti non hanno ancora una chat: una futura casella con conversazioni e
risposte dal sito è normalmente chiamata **ticketing/help desk** o **inbox condivisa**; per
una chat sincrona si parla di **live chat**. Conviene progettare prima il flusso (assegnatario,
risposte, notifiche e conservazione) e poi scegliere o integrare il servizio.

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
negli URL consentiti di Supabase Auth. I dati persistenti risiedono su Supabase, non nel
filesystem effimero del servizio web.

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
