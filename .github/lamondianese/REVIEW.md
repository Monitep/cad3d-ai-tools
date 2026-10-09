# La Mondianese — revisione desktop e leggibilità

La revisione risponde agli spazi desktop percepiti come vuoti e ai testi piccoli su smartphone. Mantiene palette, caratteri, fotografie, dati, animazioni e percorsi della proposta approvata.

## Metodo e fonti

Confrontate la skill frontend-design già presente, Anthropic frontend-design, [Impeccable](https://github.com/pbakaus/impeccable) e le [Web Interface Guidelines di Vercel](https://github.com/vercel-labs/web-interface-guidelines). Applicati i playbook layout, audit e craft floor di Impeccable 4.5.2. Salvata anche una versione di riferimento focalizzata per Work, `impeccable-web-review`, con attribuzione e licenza upstream: il pacchetto completo dipende da strumenti che questa sessione non usa.

Questa è una revisione di implementazione e composizione, fondata su HTML, CSS, JavaScript e asset. **Non è stata eseguita una revisione visiva mediante screenshot/browser**, né un collaudo su telefono fisico. Non vengono attribuiti punteggi visivi o dichiarata una conformità WCAG completa.

## Diagnosi e interventi

| Area | Evidenza nella prima versione | Correzione |
|---|---|---|
| Prima schermata | Immagine a pieno schermo, contenuto concentrato a sinistra e altezza fino a 1200 px | Altezza desktop limitata; accesso visivo a Oniro sulla destra, con apertura della scheda |
| Cantina | Titolo separato, spostato del 26%; fotografia in una colonna del 29% e intervallo del 14% | Fotografia più presente; titolo e racconto riuniti nella colonna adiacente |
| Sezioni desktop | Padding verticale 110 px e ulteriori aumenti sopra 1650 px | Ritmo verticale fluido 64–88 px, intervalli interni più stretti, colonne con misure leggibili |
| Vino in evidenza | Scheda limitata a descrizione, vitigno e temperatura | Abbinamenti e affinamento presenti direttamente, dai dati già verificati, anche in inglese |
| Catalogo | Tre colonne anche su grandi desktop | Quattro colonne da 1200 px, tre su desktop intermedi, due su tablet/mobile; `sizes` aggiornato |
| Degustazioni | Titolo su una fascia separata, immagine alta 590 px affiancata a contenuti più brevi | Titolo, descrizione e opzioni nella stessa colonna accanto alla fotografia, da 1101 px |
| Ospitalità/contatti | Intervalli ampi e testi di servizio minuti | Intervalli più compatti, misure del testo e distanze coerenti; nessuna nuova promessa commerciale |
| Immagini vino | Ritaglio potenziale nei contenitori alti | Composizione 3:4 nel teatro desktop e immagine completa nella scheda desktop; foto originale sempre disponibile |
| Leggibilità | Alcuni testi secondari da 9–11 px | Testi di servizio mobili aumentati; contrasto del colore secondario migliorato |
| Ricerca vuota | Invito a selezionare Tutti che non cancella il testo cercato | Comando esplicito per azzerare ricerca e filtro insieme |
| Accessibilità | Conteggio e vino attivo senza annuncio; alcuni controlli sotto 44 px | Annunci discreti, controlli maggiori e focus visibile |
| Caricamento | Preload desktop utilizzato anche su mobile | Preload dell’immagine appropriata al dispositivo; CSS/JS con versione per aggiornare le cache |

## Aa: dimensione del testo

Tre modalità: **Normale**, **Grande** (+15%), **Molto grande** (+30%). Cambiano testi di lettura, descrizioni, didascalie e controlli; i grandi titoli e le geometrie delle immagini restano stabili. La scelta viene conservata esclusivamente in localStorage sul dispositivo. Se lo storage non è disponibile, i controlli funzionano comunque nella sessione. Il pannello si chiude con Escape, click esterno o spostamento del focus; il menu, i dialoghi e la traduzione restano utilizzabili.

## Verifiche

- Parser CSS e controllo sintattico JavaScript riusciti.
- Test JSDOM: tutte le 11 schede, fotografie originali, filtri, ricerca e ripristino, navigazione dei vini, 11 abbinamenti/affinamenti, IT/EN, menu, richiesta via posta, controllo Aa e preferenza salvata.
- Misure dei titoli reali con i font del sito a 1200, 1366, 1440, 1920 e 2560 px: titoli della cantina entro la colonna prevista. È una misura tipografica, non un render del browser.
- Contrasto del nuovo testo secondario: 5,39:1 su carta, 5,99:1 su carta chiara, 4,70:1 sul fondo ospitalità.
- Scanner Impeccable eseguito. Le segnalazioni di padding non riconoscono i gutter CSS variabili, lo sfondo fotografico o i padding delle classi condivise: non indicano margini realmente nulli. La palette calda e alcuni elementi tipografici preesistenti sono scelte approvate, preservate intenzionalmente. La foto iniziale del dialogo ora ha anche una sorgente statica valida.

Da confermare in un browser reale: composizione finale ai diversi viewport e alle tre dimensioni Aa, comportamento dei dialoghi durante lo scroll, focus nativo, gesti touch e resa su Samsung Galaxy S25 Ultra. La pubblicazione HTTP non sostituisce queste prove.
