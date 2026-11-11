# Home: correzione del ritardo di comparsa dei contenuti

## Evidenza prima di questa correzione

Due misure PageSpeed mobile sullo stesso sito già pubblicato, con Moto G Power
emulato, Lighthouse 13.5.0 e 4G lenta. Nessun aggiornamento tra le due prove:

| Prova del 26 ottobre, ora italiana | Prestazioni | FCP | LCP | Speed Index |
|---|---:|---:|---:|---:|
| [16:09](https://pagespeed.web.dev/analysis/https-cad3d-expert/6modkjepd4?form_factor=mobile) | 98 | 1,5 s | 1,7 s | 3,7 s |
| [16:12](https://pagespeed.web.dev/analysis/https-cad3d-expert/vqb9rubdds?form_factor=mobile) | 82 | 1,5 s | 4,2 s | 4,7 s |

Entrambi indicano `.hero-description` come elemento LCP. La suddivisione mostra
un ritardo di rendering di 1.130 e 1.980 ms rispettivamente. Il JavaScript di
produzione applica `autoAlpha: 0` al titolo e alla descrizione, poi li fa comparire
in una timeline avviata dagli script differiti. Il testo può quindi venire
nascosto dopo il primo rendering e attendere script e animazione per ricomparire.
Questa dipendenza è un difetto del percorso iniziale, anche quando una singola
prova restituisce un punteggio alto. Non viene attribuita tutta la variabilità
al solo codice: rimangono le condizioni della rete, del server e del browser.

## Modifica proposta

- Titolo, descrizione, pulsanti e immagine iniziale restano visibili dal primo
  rendering. Rimangono il cambio scena su richiesta e le animazioni successive.
- Pannellum e il relativo CSS si caricano soltanto quando la sezione 360° entra
  nel margine di prossimità già previsto. Le azioni durante il caricamento
  attendono la stessa inizializzazione. L'immagine di riserva resta disponibile
  in caso di errore.
- La home usa anteprime BESS adattabili a 480, 880 e 1539 px. Per il caso mobile
  da 880 px il file passa da 888.290 a 220.694 byte, circa il 75% in meno.
- Le locandine video passano da 252.594/354.830 a 64.474/96.978 byte.
- La miniatura Scene 7 da 5.083.961 byte viene sostituita nella sola home da
  un derivato di 480 px da 20.006 byte. Il PNG non compare nella tabella immagini
  della misura mobile, quindi non viene presentato come causa dell'LCP mobile.
- Gli asset nuovi hanno nomi diversi, per evitare di riutilizzare le vecchie
  risposte in cache. La configurazione HTTP della cache rimane un intervento
  distinto. I nuovi HTML conservano impostazioni del consenso e metadata SEO.

Sono derivati WebP con compressione con perdita controllata; dimensioni,
parametri e hash sono in `home-performance-images.json`. Gli originali restano
sul server e nei materiali di provenienza. Nessuna rigenerazione generativa.

## Sorgente e riproducibilità

La PR #28 ha aggiunto una cattura FTPS di sola lettura dei file pubblicati.
`baseline/20261026/` ne conserva le home IT/EN e i moduli testuali con hash.
La ricetta di build applica soltanto le sostituzioni elencate; le vecchie pagine
dell'anteprima non vengono caricate in produzione.

```sh
python3 .github/tools/build-cad3d-home-performance.py
python3 .github/tools/build-cad3d-home-performance.py --check
python3 .github/tools/cad3d-live.py validate
python3 .github/tools/test-cad3d-live.py
node .github/tools/test-cad3d-home-performance.mjs
```

Il confronto HTML controlla testi, destinazioni dei collegamenti, ID, alt delle
immagini e metadati. Le due lingue conservano gli stessi contenuti pubblicati.
Il manifest carica prima gli asset, poi le due home, con backup e controllo
degli hash live. Una modifica successiva sul server impedisce la sovrascrittura.
Gli hash dei file sono verificati via FTPS. Via HTTPS gli asset restano verificati
byte per byte; gli HTML vengono confrontati per contenuti e riferimenti, perché
Cloudflare riscrive il collegamento email e aggiunge lo script di decodifica.
La verifica rifiuta una pagina ancora collegata al vecchio runtime o con testi diversi.

## Verifica e limiti

Controllo browser in anteprima interna: contenuti iniziali visibili; nessun tag
Pannellum all'apertura; una sola coppia script/CSS dopo l'avvicinamento; panorama
pronto, cambio Piscina/Terrazza e controllo della locandina video. Il rendering
360° verificato in questo ambiente usa il fallback CSS3D. Anteprima mobile in
iframe da 412 e 360 px; non è un test su dispositivi fisici.

Il test Node esegue i moduli reali con fixture DOM/GSAP: verifica che il testo
critico non venga nascosto, nessun download anticipato del modulo, avvio singolo,
attesa di un comando durante il caricamento, cambio scena e recupero in caso
di errore di rete. I 20 test del sistema di pubblicazione includono il ripristino
e la verifica HTML dopo la trasformazione Cloudflare.

I punteggi 98 e 82 sono misure **prima** di questa correzione. Il nuovo rilascio
deve ancora essere approvato, pubblicato e misurato; non viene promesso un
punteggio finale né dichiarata stabilità sulla base di una prova sola.
