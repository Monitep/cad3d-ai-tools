# CAD3D.Expert, anteprima del nuovo sito

16 pagine statiche in italiano e inglese: home, portfolio, servizi, architettura, rinnovabili, tour virtuali, studio e contatti. Gli asset e i dati professionali provengono dal sito pubblico CAD3D.Expert. Nessun contenuto della memoria privata, credenziale o dato personale dei clienti è incluso.

La demo usa GSAP e ScrollTrigger ufficiali, un viewer WebGL per un panorama CGI originale, filtri nel portfolio, immagini ingrandibili e un confronto fotografico BESS tra stato di fatto, progetto e mitigazione. Il modulo contatti prepara una bozza email da rileggere e inviare nell'app del visitatore; non invia dati a un server.

Destinazione della pubblicazione autorizzata: `/www.cad3d.expert/ai/cad3d-preview/`, attraverso il workflow FTP già presente. La home WordPress resta fuori dall'ambito della modifica. Le pagine della demo hanno `noindex`.

## Verifiche

Superati: sintassi di `site.js`, collegamenti locali e ancore, un H1 per pagina, metadati `noindex`, validità delle immagini WebP locali. Lo script `check-cad3d-preview.py` controlla anche i file vuoti.

La verifica visiva locale non è stata possibile: il supervisore delle anteprime non si avvia nell'ambiente. Il 9 ottobre 2026 l'utente ha autorizzato la pubblicazione. Il caricamento segue il percorso branch, PR e merge, dopo il quale si esegue la verifica sul sito HTTPS.

## Revisione e manutenzione

Anteprima: https://www.cad3d.expert/ai/cad3d-preview/ dopo il completamento del workflow FTP. Per logo, font e due immagini degli interni è necessaria la rete. Per verificare il sito completo e le funzioni 360° usare un server HTTP/HTTPS.

I contenuti si modificano in `build-cad3d-preview.py`; dopo le modifiche eseguire il generatore e il controllo. Layout e interazioni sono in `cad3d-preview/assets/style.css` e `site.js`.

Fonti: le pagine pubbliche di CAD3D.Expert (home, architettura, energie rinnovabili, tour virtuali, studio, contatti); la skill ufficiale `anthropics/skills/skills/frontend-design/SKILL.md`; GSAP e ScrollTrigger da `greensock/GSAP/dist/`.
