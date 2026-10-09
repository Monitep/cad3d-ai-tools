# La Mondianese: demo indipendente

Destinazione dopo il merge: https://cad3d.expert/ai/lamondianese/

## Risultato
Sito statico completo in italiano e inglese, con apertura panoramica, presentazione interattiva degli 11 vini, ricerca e filtri, schede con note, vitigni, alcol, temperature, affinamento e abbinamenti. Collegamenti alle schede PDF e allo shop ufficiale. Cantina, degustazioni, camere e contatti. Form che prepara un messaggio mail senza trasmettere o memorizzare dati.

La demo è esclusa dall’indicizzazione. Non elabora acquisti o prenotazioni. Nessun servizio esterno, tracker o cookie è caricato dalla pagina. Font, GSAP e immagini sono locali.

## Contenuti e fonti
Consultati il 9 ottobre 2026:
- https://www.lamondianese.com/it/i-vini/
- https://www.lamondianese.com/en/winery/
- https://www.lamondianese.com/it/visita-e-degustazioni/
- https://www.lamondianese.com/it/agriturismo/

I dati enologici usano la pagina italiana, che differisce da quella inglese in alcune temperature e nelle caratteristiche del rosato. Nessuna annata, premio, recensione, prezzo o disponibilità è inventata. Per A Tutto Rosa il vitigno non è specificato nella scheda consultata. La sospensione delle prenotazioni dell’agriturismo è dichiarata nel sito originale e rispettata.

Fotografie reali della cantina, sala degustazione, viti e camere scaricate dal sito originale. Tutte le 11 presentazioni ambientate sono generate con AI usando come reference la bottiglia corrispondente del sito originale. Nelle schede è disponibile anche la foto della bottiglia originale. Il panorama di apertura è un’interpretazione AI del Monferrato, non una documentazione geografica della tenuta.

La pubblicazione ufficiale da parte della cantina richiederà conferma dei dati correnti e dei diritti sulle fotografie. Per questa proposta il carattere di demo indipendente è esplicito nel footer e nel pannello informativo.

## Sviluppo e pubblicazione
Cartella pubblica: `lamondianese/`. Nessuna modifica al resto del repository o al workflow esistente. Il merge in main attiva `.github/workflows/deploy.yml` e l’upload FTP su Aruba. I materiali di revisione in `.github/lamondianese/` sono esclusi dall’upload dalla configurazione già presente.

Skill installate: Frontend Design (Anthropic), GSAP Core, GSAP ScrollTrigger, GSAP Timeline, GSAP Performance (GreenSock). Libreria GSAP 3.14.2, font Bodoni Moda e Manrope.

## Verifica
Sintassi JS validata con node. Verifica DOM automatizzata: 11 vini, conteggi dei filtri (2 Ruchè, 2 bianchi, 1 rosato, 6 altri rossi), ricerca, stato vuoto, apertura/chiusura di tutte le schede, link ufficiali, menu mobile, cambio IT/EN, navigazione vini, preparazione email, ancore e presenza degli asset.

Tutti i 22 collegamenti ufficiali (11 schede PDF e 11 prodotti shop) rispondono con HTTP 200.

Controlli statici: asset locali presenti; nessun riferimento mancante; layout con breakpoint 1100, 900, 650 e 360 px; riduzione movimento e focus tastiera; dimensioni font principali controllate anche per 320 px.

Limite: il controllo visivo in un browser reale non è stato disponibile in questa sessione; non è stato eseguito un test su dispositivo fisico né una misura Lighthouse.

Per ripetere il controllo DOM dalla radice del repository: `npm install --prefix .github/lamondianese` e `npm run --prefix .github/lamondianese verify`.
