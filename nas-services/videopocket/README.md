# VideoPocket: installazione sul Synology

Versione 1.0 da installare e collaudare sul NAS. Il servizio non è ancora installato né pubblicato. Non richiede credenziali Synology nell’app.

## Cosa è pronto

- Interfaccia in italiano, adattabile allo schermo del Samsung S25 Ultra e installabile come PWA.
- Lettura di un link pubblico con yt-dlp, scelta video 720p/1080p/4K o MP3, coda persistente, annullamento, eliminazione e nuovo tentativo.
- Ricerca YouTube nell’app. Collegamenti e ricerche sui siti esterni aprono il browser; il loro sito completo non viene incorporato.
- Download sul NAS che continuano a pagina chiusa. Un secondo pulsante trasferisce il file sul telefono senza caricarlo prima nella memoria JavaScript.
- Password dedicata, sessioni revocabili, limiti di spazio e pulizia automatica.

Il supporto di yt-dlp non garantisce ogni singolo sito o video. La prima versione usa video pubblici, senza importare cookie, account o password delle piattaforme. Niente DRM, dirette in corso o playlist. Alcuni portali, anche fra i collegamenti disponibili, possono richiedere un account o proteggere i video. La risoluzione selezionata è un limite richiesto quando la sorgente ne dichiara le dimensioni; con collegamenti diretti di risoluzione sconosciuta viene conservato il file originale. Il video mantiene i codec originali e può essere MP4, WebM o MKV. Nessuna ricodifica video pesante sul NAS.

## Architettura

| Componente | Dove | Funzione |
| --- | --- | --- |
| Interfaccia `videopocket/` | `cad3d.expert/ai/videopocket/`, dopo approvazione | Browser del telefono e installazione Home |
| Servizio Python + yt-dlp + ffmpeg + Deno | Container sul NAS | Ricerca, estrazione e download |
| Volume Docker dedicato | NAS | File e coda, senza accesso alle altre cartelle |
| Tailscale Serve o reverse proxy HTTPS privato | NAS | Collegamento protetto fra sito e servizio |

Il container serve anche una copia completa dell’interfaccia. Puoi quindi usare direttamente l’indirizzo privato HTTPS del NAS, oltre alla copia sul tuo sito. È la modalità più semplice se il browser limita le connessioni da un sito pubblico a una rete privata.

La GitHub Action FTP pubblica soltanto l’interfaccia: `nas-services/**` e `videopocket/tests/**` sono esclusi. Non inserire mai il file `.env` o una password nei file destinati ad Aruba.

## Prima dell’installazione

Verificare insieme:

1. Versione DSM e presenza di Container Manager, oppure del precedente pacchetto Docker e Docker Compose.
2. RAM disponibile: il container ha limite di 1,5 GB. Non è una promessa di consumo costante. Se il NAS ha poca RAM libera, fermarsi e adeguare il limite.
3. Spazio disponibile: almeno 7 GB liberi per un file fino a 2 GB, perché audio, video separati e fusione possono coesistere temporaneamente.
4. Funzionamento di Tailscale sul NAS e sul telefono, se si vuole accesso fuori casa senza esporre porte del router.

Non è necessario attivare accessi amministrativi remoti per usare l’app.

## Installazione del servizio

1. Scarica dal branch della pull request una copia del repository con **Code → Download ZIP**. In alternativa, usa una copia Git autorizzata. Mantieni le cartelle `videopocket/` e `nas-services/videopocket/` con la struttura originale.
2. Copia la cartella del repository sul NAS, ad esempio `/volume1/docker/cad3d-ai-tools`. Questo è un percorso di esempio: non cambiare cartelle esistenti.
3. In `nas-services/videopocket/`, copia `.env.example` come `.env` e imposta una password nuova di almeno 16 caratteri. La password è soltanto dell’app. Inseriscila localmente sul NAS, senza inviarla in chat.
4. Lascia `NAS_BIND_IP=127.0.0.1` per la modalità privata con Tailscale Serve. Il servizio ascolta sul NAS, non su tutte le interfacce.
5. In Container Manager crea un progetto usando il file `compose.yaml` e la cartella `nas-services/videopocket/`. Il contesto di build deve essere la radice del repository, come indicato nel file Compose. Se l’interfaccia DSM richiede `docker-compose.yml`, usa una copia identica di `compose.yaml` con quel nome nella stessa cartella.
6. Se si usa il terminale del NAS, dalla cartella del servizio esegui:

```sh
docker compose -f compose.yaml up -d --build
```

Con il vecchio comando Compose, se già installato:

```sh
docker-compose -f compose.yaml up -d --build
```

La prima build scarica immagini e dipendenze. La compatibilità della build sul tuo DSM resta da verificare. Il container usa un utente non root; il volume Docker dedicato deve mantenere il proprietario UID 10001, predisposto nell’immagine. Non monta cartelle di documenti, fotografie, backup o credenziali del NAS.

## Collegamento privato consigliato

1. Installa Tailscale dal Centro pacchetti Synology e sul Samsung. Collega entrambi al tuo account. Scegli le regole di accesso che permettono soltanto ai dispositivi autorizzati di raggiungere questo servizio.
2. Verifica la versione Tailscale e la disponibilità del comando `serve`. Le impostazioni DSM effettive vanno controllate prima di eseguire comandi amministrativi.
3. Con HTTPS Tailscale abilitato, il comando da eseguire localmente sul NAS è:

```sh
tailscale serve --bg http://127.0.0.1:8787
tailscale serve status
```

Se è richiesta elevazione sul NAS, eseguila tu dal terminale locale. Non inviare in chat la password amministrativa. Il comando mostra l’URL HTTPS del tuo servizio, accessibile dai dispositivi della tua rete Tailscale. Questa configurazione usa Serve, mantenendo l’accesso all’interno della VPN.

4. Attiva Tailscale sul Samsung e apri l’URL HTTPS del servizio. Nella scheda **NAS**, inserisci l’indirizzo base e la password di VideoPocket.
5. Dopo la pubblicazione, puoi aprire anche `https://cad3d.expert/ai/videopocket/` e inserire lo stesso indirizzo. Il telefono deve mantenere la VPN attiva. Se Chrome chiede accesso alla rete locale, concedilo soltanto al sito previsto; se la connessione dal sito pubblico viene bloccata, usa direttamente l’interfaccia sull’URL HTTPS del NAS.

**Una VPN fra i tuoi dispositivi non dà automaticamente accesso a ChatGPT.** In questa sessione non è presente un collegamento Synology/SSH confermato, né il mio ambiente è iscritto alla tua rete Tailscale. L’installazione può essere eseguita da te con queste istruzioni. Un eventuale accesso assistito va scelto e verificato separatamente, con permessi limitati e revocabili. Non condividere account amministrativi, chiavi private o password in chat.

Alternativa solo LAN: impostare `NAS_BIND_IP` sull’IP LAN specifico del NAS, accedere a `http://IP_DEL_NAS:8787` e usare l’interfaccia servita direttamente dal container. Richiede configurazione coerente del firewall NAS. HTTP non è indicato per internet e dal sito HTTPS viene rifiutato. Per PWA, condivisione Android e uso fuori casa preferire HTTPS privato.

## Uso sul Samsung

1. Apri l’app in Chrome o Samsung Internet; in Chrome la registrazione nel menu Condividi è documentata per le PWA installate.
2. Scheda **NAS**: collega e verifica.
3. Scheda **Download**: incolla un link e premi **Leggi il video**.
4. Scegli la qualità e premi **Scarica sul NAS**. La preparazione prosegue anche a telefono bloccato.
5. Quando compare **Pronto sul NAS**, premi **Salva sul telefono**. Il browser trasferisce il file nella propria cartella Download. Per questa seconda fase valgono la connessione e le regole di risparmio energetico del telefono.
6. Scheda **Cerca**: YouTube restituisce fino a 8 risultati; gli altri pulsanti aprono la ricerca nel sito originale. Scheda **Siti**: apre le piattaforme nel browser.
7. Aggiungi l’app alla schermata Home dal menu del browser. Il manifest include la ricezione dei link dal menu Condividi di Android: disponibilità da verificare sul telefono e browser effettivi.

## Limiti e conservazione

| Impostazione | Valore iniziale |
| --- | --- |
| Download attivi | 1, sequenziale |
| Elementi in coda | 12 |
| Dimensione finale per file | 2048 MiB |
| Budget complessivo del volume | 10240 MiB, controllato durante i download |
| Durata del video / tempo massimo del download | 2 ore |
| Conservazione dei download terminati | 48 ore |
| Sessione del telefono | Massimo 12 ore; può terminare chiudendo la finestra, revocabile con Disconnetti |
| Link temporaneo di trasferimento | Valido per avviare richieste entro 60 secondi |

Lo spazio iniziale richiesto include fino a tre volte il limite del file per la lavorazione. La quota è un controllo applicativo con campionamento, non una quota filesystem rigida. I file terminati scadono automaticamente; le copie già salvate sul telefono rimangono. Al riavvio del servizio la coda riprende, ma il download interrotto può dover ripartire e occorre accedere di nuovo.

## Aggiornamento e arresto

Quando un sito cambia, yt-dlp può richiedere un aggiornamento. Dalla cartella del servizio:

```sh
docker compose -f compose.yaml build --pull --no-cache
docker compose -f compose.yaml up -d
```

La build installa la versione disponibile da PyPI compatibile con i requisiti. Per eventuali problemi YouTube controllare anche Deno e il pacchetto `yt-dlp-ejs` inclusi nell’immagine. Un aggiornamento può cambiare la compatibilità: provare un video breve prima di scaricare grandi file.

Per fermare l’app senza cancellare i video:

```sh
docker compose -f compose.yaml stop
```

Il volume dedicato mantiene file e coda. Non usare opzioni che eliminano i volumi se vuoi conservarli.

## Verifiche effettuate e da fare

- Test API: autenticazione e revoca, blocco tentativi, CORS, coda e limite, annullamento, eliminazione, scadenza dei file, link temporanei e richieste parziali per il trasferimento.
- Test rete: rifiuto di link privati e blocco delle connessioni verso indirizzi privati, loopback, link-local e multicast; controllo anche degli indirizzi restituiti dal DNS e delle connessioni effettive.
- Prova del motore yt-dlp e della conversione MP3 con un video CC0 servito da un server di test locale. Il test consente loopback soltanto nel processo di prova; la configurazione di produzione lo blocca.
- 27 test Python superati; test browser superati sui quattro pannelli a 320, 360, 384, 412, 480, 768 e 1280 pixel, anche con testo al 200%. Verificati login, ricerca e coda con risposte di prova, ricezione del link, assenza di errori JavaScript e cache della PWA. Questa emulazione non sostituisce la prova sul Samsung fisico.
- La prova di estrazione diretta da un sito pubblico non è completata: il DNS diretto dell’ambiente di sviluppo è limitato. Non equivale a un collaudo riuscito di YouTube, TikTok o altri siti.
- Da fare sul tuo impianto: build Docker, accesso VPN/HTTPS, primo download da YouTube e da un altro sito, salvataggio sul Samsung, installazione Home e ricezione da Condividi.

Test riproducibili:

```sh
python -m pip install -r nas-services/videopocket/requirements.txt pytest httpx
python -m pytest videopocket/tests/test_service.py -q
```

Per la prova dell’interfaccia leggere le istruzioni nel test `videopocket/tests/browser.cjs`. I dati dei test non sono contenuti approvati dell’utente e non sono visualizzati nell’app di produzione.

## Fonti tecniche

- [yt-dlp: documentazione e dipendenze](https://github.com/yt-dlp/yt-dlp)
- [yt-dlp: siti supportati](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- [Runtime JavaScript per YouTube](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [Tailscale su Synology](https://tailscale.com/docs/integrations/synology)
- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Comando Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
- [Chrome: ricezione dei link nelle PWA](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
