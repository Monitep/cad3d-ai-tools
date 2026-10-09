# CAD3D.Expert, anteprima del nuovo sito

16 pagine statiche in italiano e inglese: home, portfolio, servizi, architettura, rinnovabili, tour virtuali, studio e contatti. Gli asset e i dati professionali provengono dal sito pubblico CAD3D.Expert. Nessun contenuto della memoria privata, credenziale o dato personale dei clienti è incluso.

La demo usa GSAP e ScrollTrigger ufficiali, un viewer WebGL per un panorama CGI originale, filtri nel portfolio, immagini ingrandibili e un confronto fotografico BESS tra stato di fatto, progetto e mitigazione. Il modulo contatti prepara una bozza visibile da rileggere, poi offre il collegamento all’app email e la copia del testo. Non invia dati a un server.

Destinazione della pubblicazione autorizzata: `/www.cad3d.expert/ai/cad3d-preview/`, attraverso il workflow FTP già presente. La home WordPress resta fuori dall'ambito della modifica. Le pagine della demo hanno `noindex`.

## Verifiche

Superati: sintassi di `site.js`, collegamenti locali e ancore, un H1 per pagina, metadati `noindex`, validità delle immagini WebP locali. Lo script `check-cad3d-preview.py` controlla anche i file vuoti.

Il 9 ottobre 2026 l’utente ha autorizzato la pubblicazione. La PR #8 è stata unita e il workflow FTP 37985020300 è terminato con successo. Sul sito HTTPS sono stati verificati cambio scene, menu mobile, tutti i filtri del portfolio, apertura/chiusura delle immagini e confronto BESS con tastiera. Le otto sezioni italiane, più home e contatti inglesi, sono state controllate a 360 e 412 px senza overflow orizzontale. Il browser di verifica non espone WebGL: si verifica la vista alternativa con accesso diretto al tour completo; il rendering 3D resta da verificare su un browser con WebGL.

## Revisione e manutenzione

Anteprima: https://www.cad3d.expert/ai/cad3d-preview/index.html dopo il completamento del workflow FTP. Logo, font Manrope e immagini degli interni sono locali. Per verificare il sito completo e le funzioni 360° usare un server HTTP/HTTPS.

La revisione del 9 ottobre conserva il logo originale a 300 × 75 px senza filtri di colore, su fondo chiaro nella home e nel footer. Le immagini dei servizi e la villa in evidenza mostrano l’intera composizione. La home e le aperture dei servizi offrono l’ingrandimento con tastiera, chiusura tramite Escape e ritorno del focus. Le dimensioni intrinseche delle immagini sono registrate in `assets/image-sizes.json`: aggiornare questo manifest quando si sostituiscono gli asset. I filtri del portfolio aggiornano l’URL, supportano Indietro e vengono conservati nel cambio lingua. Le nuove risorse CSS/JS usano `v=3`.

La successiva revisione `v=4` usa quattro immagini rigenerate con ImageGen su richiesta dell’utente: villa panoramica, villa verticale per telefono e due bagni senza la filigrana CAD3D.Expert. I render mantengono il soggetto architettonico e affinano luce e materiali. Le immagini native sono 1672 × 941 px oppure 941 × 1672 px; non sono 4K. I WebP sono esportati alla dimensione nativa, senza ingrandimenti interpolati. `srcset` sceglie le versioni complete sui riquadri grandi o sui display densi; un `<picture>` dedica al telefono la composizione verticale della villa. Manrope è ospitato localmente in WOFF, con licenza SIL OFL, per titoli e testo. La spaziatura negativa dei titoli è ridotta per evitare lettere sovrapposte.

Due prove di rigenerazione della sferica sono state escluse: entrambe 1774 × 887 px, con discontinuità al bordo maggiori dell’originale. Il panorama e il tour originali sono conservati. Il recupero della configurazione pubblica del tour è risultato bloccato negli strumenti disponibili; per migliorare realmente il 360° occorre un originale equirettangolare ad alta risoluzione, idealmente 8192 × 4096 px. Prompt, scelte e limiti effettivi sono in `CAD3D-AI-ASSETS.json`.

I contenuti si modificano in `build-cad3d-preview.py`; dopo le modifiche eseguire il generatore e il controllo. Layout e interazioni sono in `cad3d-preview/assets/style.css` e `site.js`.

## Master 16K e video originali, revisione v5

L’utente ha fornito `Render Per Tour No People.zip`, con due master sferici nativi 16384 × 8192 px: `D5_A03_20240201_184512.jpg` e `D5_A04_20240201_183040.jpg`. Il 360° in home e nella pagina tour usa entrambi, selezionabili come Terrazza e Piscina. Le vecchie texture ridotte e le prove AI non sono usate dal nuovo viewer.

Pannellum 2.5.7 ufficiale è ospitato localmente, con licenza MIT. I master vengono proiettati in facce cubiche da 5216 px, con densità angolare coerente con l’originale 16K, divise in tasselli JPEG da massimo 2048 px e tre livelli di dettaglio. Il viewer WebGL carica le tessere visibili e aumenta il dettaglio con lo zoom; non scarica un’unica texture ridotta. Il percorso CSS 3D per i browser senza WebGL usa facce alternative da 2048 px. Le immagini prospettiche da 1600 × 900 sono soltanto poster di caricamento e fallback statici. Il full detail WebGL richiede verifica su un dispositivo che lo supporti; il browser di lavoro può verificare il percorso CSS 3D.

I due video originali, di circa 18 e 10 secondi, sono presenti in home, architettura e tour, in entrambe le lingue. Il player mostra l’intero fotogramma, offre due sequenze, riproduzione e pausa, controlli nativi e poster. MP4 H.264 a 1080p per desktop e 720p per telefoni, 30 fps, senza audio, con `faststart` e `preload="none"`. Nessun autoplay; pausa quando il player esce dalla vista o la pagina diventa nascosta.

La preparazione è riproducibile con `prepare-cad3d-media.py --source-dir /percorso/materiale` (Pillow e FFmpeg). Gli originali forniti non vengono modificati. Provenienza, hash, risoluzioni native, livelli e file video sono in `CAD3D-MEDIA-ASSETS.json`; le nuove interazioni sono in `assets/media-v5.js`. Tutte le pagine usano CSS/JS `v=5`. Il sito WordPress e i tour già esistenti rimangono fuori dall’ambito della pubblicazione dell’anteprima.

Fonti: le pagine pubbliche di CAD3D.Expert (home, architettura, energie rinnovabili, tour virtuali, studio, contatti); la skill ufficiale `anthropics/skills/skills/frontend-design/SKILL.md`; GSAP e ScrollTrigger da `greensock/GSAP/dist/`. Verificate le versioni correnti del design Anthropic e di `vercel-labs/agent-skills/skills/web-design-guidelines/SKILL.md`, con le regole da `vercel-labs/web-interface-guidelines/command.md` e la documentazione ufficiale GSAP `gsap.matchMedia()`.
