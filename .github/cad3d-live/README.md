# Aggiornamenti del sito pubblico CAD3D.Expert

Proposta corrente: [home, caricamento iniziale e anteprime](HOME-PERFORMANCE-20261026.md).
Contiene le misure prima della correzione, la build riproducibile e i controlli.
I dettagli del rilascio iniziale delle sole due immagini restano sotto come storico.

Workflow dedicato alla nuova vetrina in `_cad3d-site/`. Riutilizza `FTP_SERVER`,
`FTP_USERNAME` e `FTP_PASSWORD` già configurati per Aruba, con **FTPS esplicito
e certificato verificato**. Il collegamento e i permessi su questa cartella
vanno confermati dalla prima esecuzione: i Secrets non sono leggibili dalla chat.

Il primo collegamento del 26 ottobre ha rilevato un alias FTP non incluso nel
certificato. La diagnosi senza autenticazione ha verificato catena CA e SAN
`ftplnx02.aruba.it`. Il client usa questo nome certificato e, prima di inviare
le credenziali, controlla che l'IP del peer appartenga agli indirizzi del server
FTP configurato. Se Aruba cambia infrastruttura senza corrispondenza il rilascio
si ferma. Restano attivi i controlli CA, hostname e cifratura del canale dati.
La diagnosi è ripetibile con `CAD3D - diagnosi certificato FTPS`; non usa username
o password e non modifica file.

Il precedente `Deploy FTP su Aruba` continua a gestire l'area `/ai/`.
Il nuovo workflow non cambia la configurazione della root e non cerca di
sincronizzare l'intero hosting.

## Uso con ChatGPT, Codex o Claude

Chiedere la modifica indicando pagina e risultato desiderato. L'assistente:

1. Legge queste istruzioni e recupera i sorgenti correnti delle parti coinvolte.
2. Confronta i file con la versione online; conserva contenuti e correzioni live.
3. Modifica i sorgenti, prepara soltanto i file necessari e aggiorna `release.json`.
4. Apre una PR e presenta cambiamenti, controlli e limiti.
5. Dopo l'approvazione di Michele integra la PR; GitHub pubblica su Aruba.
6. Controlla la Action e il sito, poi riporta il risultato effettivo.

Non servono password da incollare in chat. L'accesso è eseguito da GitHub
Actions, usando i Secrets esistenti, non direttamente dall'assistente.

## Cosa avvia la pubblicazione

- **Pull request:** validazione dei file e test, senza Secrets e senza accesso FTP.
- **Merge/push su main che modifica release.json:** piano, backup, upload e
  verifica dei byte. Il merge è il passaggio di pubblicazione autorizzato.
- **Actions → CAD3D - aggiornamento sito pubblico → Run workflow → plan:**
  confronto e backup, senza modifiche al server. Selezionare il branch main.
- Nella stessa schermata **deploy** ripete il rilascio di main. Se è già
  completato, i file uguali vengono riconosciuti e lasciati al loro posto.

Il collegamento GitHub della chat può creare e integrare PR. In questa sessione
non è disponibile un comando per avviare manualmente un workflow; l'avvio
ordinario tramite merge evita quel passaggio manuale.

## Manifest di rilascio

Ogni voce specifica sorgente locale, destinazione relativa, SHA-256 iniziale
e SHA-256 nuovo. Il namespace remoto è fisso. Sono consentiti asset pubblici,
`pages/it/*.html`, `pages/en/*.html` e `sitemap.xml`. Un file aggiunto usa
`before_sha256: null`; la cartella di destinazione deve già esistere e deve
essere leggibile via MLSD. Non vengono create cartelle remote automaticamente.

```sh
python3 .github/tools/cad3d-live.py validate
python3 .github/tools/test-cad3d-live.py
```

Il piano controlla **tutti** gli hash remoti prima della prima scrittura.
Differenze impreviste bloccano il rilascio invece di sovrascrivere il lavoro di
un'altra sessione. Il backup è caricato negli artifact della run prima
dell'upload. Ogni file viene prima caricato con un nome temporaneo, riletto e
verificato; solo dopo sostituisce la destinazione. Un errore avvia il ripristino
dei file cambiati, con verifica. Un guasto di rete può impedire anche il
ripristino: in quel caso la run fallisce e il backup resta disponibile.

Dopo l'upload viene controllata anche la consegna HTTPS delle risorse e la
risposta della home. Se il controllo HTTPS fallisce, la run segnala il problema;
i byte verificati via FTPS possono essere già pubblicati. Un problema di CDN
non avvia un ripristino automatico che potrebbe sovrascrivere ulteriori modifiche.

## Ripristino e cache

Il backup `cad3d-backup-<run>-<tentativo>` conserva `plan.json` e i byte iniziali
in `before/` per 30 giorni. Per un ripristino successivo preparare una nuova PR:
usare i file `before/` come payload e l'hash attualmente online come hash
iniziale. Per queste prime immagini esistono anche gli originali conservati in
`originals/` e la cronologia Git. Non cancellare file remoti estranei.

La verifica FTPS conferma i byte sul server di origine. Cloudflare/browser
possono servire una copia precedente fino alla scadenza della cache: per
controlli HTTP usare una query specifica del rilascio e verificare la pagina
pubblica. Non è incluso un accesso alla configurazione Cloudflare. Cambiamenti
futuri di CSS/JS richiedono anche riferimenti con versione aggiornati negli HTML.

## Rilascio iniziale

Due immagini della home ricodificate WebP, senza modificare pixel dimensionali,
inquadrature o contenuti. Misure su file effettivi, prima della pubblicazione:

| Immagine | Prima | Dopo | Riduzione |
|---|---:|---:|---:|
| Villa smartphone, 941 × 1672 | 463.648 B | 266.022 B | 42,6% |
| Villa desktop, 1672 × 941 | 541.074 B | 328.180 B | 39,3% |

È una ricompressione con perdita controllata, non una rigenerazione delle
immagini. La resa è stata ispezionata, ma i byte non sono identici.
Non è stato misurato un nuovo punteggio PageSpeed. Il PNG servizi da 5,1 MB,
le animazioni iniziali, il caricamento di Pannellum e la cache restano interventi
successivi da eseguire sui sorgenti aggiornati della versione pubblica.
