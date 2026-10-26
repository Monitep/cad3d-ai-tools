# CAD3D.Expert pubblico: rilascio selettivo

Il sito pubblico è online dal 26 ottobre 2026, come dichiarato da Michele e
osservato su HTTPS. Il vecchio workflow `deploy.yml` aggiorna soltanto `/ai/`.
Questo strumento raggiunge esclusivamente `/www.cad3d.expert/_cad3d-site/`
attraverso GitHub Actions e gli stessi Secrets Aruba. Non concede alla chat
una sessione FTP o accesso alle credenziali.

## Manutenzione

- `release.json` è la lista esplicita dei file da pubblicare, non un inventario
  da sincronizzare. Specificare hash del file live iniziale e hash dei nuovi byte.
- Per gli asset già presenti in Git usare il loro sorgente in
  `cad3d-preview/assets/`. Conservare gli originali e la provenienza.
- Il progetto in `main` descrive ancora una vecchia anteprima. Non ricostruirlo
  e caricarlo integralmente sulla produzione: mancano aggiornamenti v22 e
  successive correzioni già osservate online.
- Prima di modificare pagine, recuperare i sorgenti correnti e confrontare il
  risultato con la versione live. Conservare le correzioni successive al
  pacchetto del 24 ottobre. Un eventuale payload mirato va in `payload/`, senza
  credenziali, dati personali o materiale della memoria professionale.
- Le due home correnti hanno ora un adattamento riproducibile:
  `baseline/20261026/` conserva i byte letti via FTPS, `home-performance-source/`
  contiene i moduli modificabili e `build-cad3d-home-performance.py` genera
  `payload/`. Modificare la ricetta o i moduli, ricostruire e controllare il
  risultato; non correggere soltanto gli HTML generati. Se la produzione cambia,
  ricatturare e confrontare la baseline prima di una nuova modifica.
- Non cambiare root `.htaccess`, WordPress, database, tour, `/ai/` o altri
  progetti attraverso questo workflow. I file eseguibili e le configurazioni
  nascoste sono esclusi dal validatore.
- Nessun mirroring con cancellazione, nessun fallback FTP non cifrato, nessuna
  disattivazione dei controlli dei certificati.

## Autorizzazione e verifica

Lavorare con branch e PR. L'integrazione di una modifica a `release.json` in
`main` pubblica i soli file elencati: ottenere l'approvazione sul rilascio
concreto prima del merge. Il merge della PR iniziale attiva il workflow e
pubblica le due immagini indicate.

Controllare validazione offline, Action, backup e risultato online. Una run
`plan` non pubblica nulla. Non dichiarare il collegamento FTPS collaudato prima
di una run riuscita. Le verifiche locali e con server simulato non provano la
configurazione o i permessi dell'account Aruba.

Non promettere un punteggio PageSpeed. Riportare separatamente byte misurati,
risultati del browser e misure Lighthouse effettivamente eseguite.
