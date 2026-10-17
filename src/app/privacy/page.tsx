import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informativa privacy e cookie",
  description:
    "Informazioni sul trattamento dei dati personali e sull'uso dei cookie nel sito di FA IT.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="inner-page legal-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Informazioni · bozza da completare prima della pubblicazione</p>
        <h1>Privacy, senza<br /><span className="serif-accent">giri di parole.</span></h1>
        <p className="inner-lede">
          Questa è una bozza informativa per il progetto in fase di avvio. I dati del titolare,
          i tempi di conservazione e i fornitori effettivi devono essere verificati e completati
          prima di raccogliere dati reali.
        </p>
      </section>
      <article className="section-wrap legal-content">
        <section>
          <h2>Chi tratta i dati</h2>
          <p>
            Il titolare del trattamento deve essere indicato qui prima della messa online:
            denominazione o nome e cognome, indirizzo, codice fiscale/partita IVA quando
            applicabile e un recapito per le richieste privacy. FA IT è attualmente
            un progetto in fase di avvio, non una società costituita.
          </p>
          <p><strong>Recapito privacy:</strong> da definire prima della pubblicazione.</p>
        </section>
        <section>
          <h2>Quali dati raccogliamo e perché</h2>
          <p>
            Se attivati, il modulo contatti raccoglie nome, email, eventuale azienda e il
            contenuto del messaggio per rispondere alla richiesta. Il modulo candidature
            raccoglie nome, email, informazioni sul percorso e il CV per valutare una
            candidatura spontanea.
          </p>
          <p>
            Le richieste non vengono usate per inviare comunicazioni promozionali. Non
            inserire nel modulo dati particolari o non pertinenti.
          </p>
        </section>
        <section>
          <h2>Base giuridica e conservazione</h2>
          <p>
            I dati dei contatti sono trattati per dare seguito a una richiesta precontrattuale.
            I dati di candidatura sono trattati per valutare la candidatura sulla base del
            consenso espresso nel modulo. Il periodo di conservazione per ciascuna finalità,
            i criteri di cancellazione e i recapiti per revocare il consenso devono essere
            definiti e indicati dal titolare prima di attivare la raccolta.
          </p>
          <p>
            Le successive comunicazioni relative a una richiesta possono essere scambiate
            via email e conservate insieme alla conversazione nel database, per dare seguito
            al contatto. Il personale di supporto autorizzato e gli amministratori possono
            accedere alle conversazioni. Il servizio email usato per invio e ricezione è
            Resend; titolare e responsabile devono verificare i relativi accordi, i trasferimenti
            e i tempi di conservazione prima di attivare il flusso.
          </p>
        </section>
        <section>
          <h2>CV e destinatari</h2>
          <p>
            I CV, se il modulo viene attivato, devono essere conservati in un archivio
            privato e accessibile solo a chi è autorizzato alla selezione. I fornitori
            tecnici (hosting, database e archiviazione) e i relativi accordi sul trattamento
            devono essere verificati prima del lancio. I CV non devono essere esposti
            pubblicamente o inviati a destinatari non autorizzati.
          </p>
        </section>
        <section>
          <h2>I tuoi diritti</h2>
          <p>
            Puoi chiedere accesso, rettifica, cancellazione, limitazione o portabilità dei
            dati, opporti al trattamento quando previsto e revocare il consenso senza
            pregiudicare la liceità del trattamento svolto prima della revoca. Puoi inoltre
            proporre reclamo al Garante per la protezione dei dati personali. Il recapito
            del titolare va completato prima della pubblicazione.
          </p>
        </section>
        <section>
          <h2>Cookie e preferenze</h2>
          <p>
            La versione iniziale del sito non integra strumenti di analytics, advertising o
            cookie di terze parti. La scelta tra accettare o rifiutare i cookie facoltativi
            viene memorizzata nel browser. Eventuali strumenti non necessari dovranno restare
            disattivati fino a quando non sarà raccolto un consenso valido.
          </p>
          <p>
            Puoi riaprire le preferenze in qualsiasi momento tramite il pulsante “Preferenze
            cookie” nel sito. I cookie tecnici necessari al funzionamento non richiedono
            consenso secondo la normativa applicabile.
          </p>
        </section>
        <section>
          <h2>Ultimo aggiornamento</h2>
          <p>Bozza iniziale — da rivedere con il titolare e un professionista prima del lancio.</p>
        </section>
      </article>
    </div>
  );
}
