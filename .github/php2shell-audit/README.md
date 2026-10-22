# PHP2Shell Audit

Pubblicazione: https://www.cad3d.expert/ai/php2shell-audit/ tramite il workflow FTP esistente.

Console in italiano per verificare **versione e configurazione del runtime web PHP** rispetto a CVE-2026-109618 e CVE-2026-109619, secondo gli avvisi ufficiali consultati il 22 ottobre 2026.

## Uso

1. Aprire la console tramite HTTPS.
2. Scaricare dalla console il file PHP diagnostico personalizzato.
3. Caricarlo nella cartella dell'applicazione che usa il runtime da verificare. Richiede PHP 5.4 o successivo e un hosting che esegua i file PHP.
4. Mantenere aperta la stessa scheda: la chiave è nel sessionStorage del browser. Non è trasmessa al Site né inclusa nel report.
5. Inserire l'URL HTTPS esatto del file; confermare l'autorizzazione ed eseguire la lettura.
6. Esportare JSON o stampare in PDF; eliminare il file PHP dal server dopo il controllo.

La scadenza è di un'ora dalla generazione, secondo l'orologio del browser e del server. Un proxy deve lasciare passare gli header `X-Audit-Token` e `X-Audit-Nonce` e le richieste CORS OPTIONS. Sono rifiutati reindirizzamenti, credenziali nell'URL, query, frammenti e porte personalizzate. La risposta è limitata a 32 KB e il timeout a 12 secondi. Il file non risponde senza chiave; la chiave è verificata attraverso SHA-256 con confronto costante su 64 caratteri. Il file contiene l'hash della chiave, non la chiave originale. Il browser verifica un nonce fresco nella risposta.

Il confronto manuale della versione e l'importazione di report JSON sono disponibili come modalità separate. Il contenuto importato è validato, ridotto ai campi previsti e mostrato come non autenticato. Tutti i risultati importati vengono ricalcolati; non ci si fida del verdetto contenuto nel file.

## Cosa significa il risultato

Le prime release ufficiali corrette sono PHP 8.2.35, 8.3.36, 8.4.27 e 8.5.12. I pacchetti di distribuzioni e fornitori possono integrare backport mantenendo una versione precedente: questa possibilità richiede conferma indipendente del fornitore per entrambe le CVE. Una dichiarazione di backport non diventa automaticamente un risultato positivo. Versioni preliminari e rami fuori baseline hanno un esito non conclusivo.

Il file legge PHP_VERSION, PHP_SAPI, sistema operativo, flag ZTS e un elenco limitato di direttive INI pertinenti. Non usa phpinfo(), non legge segreti o percorsi di sistema, non esegue processi, non modifica la configurazione e non invia payload exploit. Non viene eseguito nessun tentativo di esaurimento memoria, corruzione heap o upload di web shell.

**È una valutazione delle patch, non un test exploit e non una certificazione di sicurezza.** Non prova che un'installazione sia concretamente sfruttabile; non esclude compromissioni precedenti, altre vulnerabilità o pool diversi. Un file aggiunto potrebbe usare una configurazione differente da quella delle pagine applicative. Le impostazioni INI osservate nello script non attestano necessariamente lo stato applicato prima dell'inizializzazione della richiesta. Un report CLI non viene interpretato come una verifica del sito. Ripetere per ciascun pool, nodo, dominio o cartella configurati diversamente e confermare il riavvio dei worker dopo la patch.

## Privacy

App statica senza backend di scansione, analytics o salvataggio dei report. Il browser invia le richieste diagnostiche direttamente all'URL scelto. I dati sono elaborati localmente; il solo token temporaneo necessario al controllo rimane nel sessionStorage della scheda. Il provider hosting e il gestore del browser mantengono le proprie normali funzioni di rete e logging.

## Sviluppo e verifica

Nessuna dipendenza npm:

```sh
node --test .github/php2shell-audit/tests/*.test.mjs
```

Sorgenti pubblicabili in `php2shell-audit/`. Documentazione e test in `.github/php2shell-audit/`, esclusi dall’upload FTP. Il download diagnostico richiede HTTPS e Web Crypto. Nell'anteprima HTTP interna la generazione è intenzionalmente indisponibile; confronto manuale e demo restano verificabili.

Sono stati controllati i confini di tutte e quattro le release corrette, gestione backport e versioni preliminari, importazioni non attendibili, validazione URL e costruzione del file protetto. Il runtime PHP non è installato nell'ambiente di sviluppo: lo script PHP generato non è stato eseguito qui su un interprete PHP o su un hosting reale. Nessun sito reale è stato testato durante la creazione.

## Fonti primarie

- https://www.php.net/archive/2026.php
- https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w
- https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp
- https://github.com/NCSC-NL/php2shell
