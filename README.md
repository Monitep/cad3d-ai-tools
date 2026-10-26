# CAD3D.Expert: guida alle modifiche del sito

Il nuovo sito pubblico è online in `https://www.cad3d.expert/`.
Il sistema per aggiornarlo è descritto nella
[guida di pubblicazione](.github/cad3d-live/README.md), con istruzioni per gli
assistenti in [.github/cad3d-live/AGENTS.md](.github/cad3d-live/AGENTS.md).
Il workflow dedicato pubblica soltanto i file esplicitamente elencati dopo
l'approvazione e il merge della PR; riutilizza i Secrets Aruba esistenti.
La connessione FTPS alla nuova destinazione va verificata dalla prima run.

**Le istruzioni seguenti riguardano la vecchia anteprima**, ancora in
`https://www.cad3d.expert/ai/cad3d-preview/`. I suoi sorgenti non contengono tutte
le modifiche pubblicate successivamente. Non caricarla integralmente sul sito
pubblico: per le modifiche recuperare prima i sorgenti correnti.
Questo repository ospita anche altre applicazioni: la home CAD3D è
`cad3d-preview/index.html`, non l'`index.html` della cartella principale.

Il sito si può modificare con Codex, Claude o un altro assistente che abbia accesso
ai file del repository. I contenuti sono HTML leggibile, i menu sono dati JSON e
le parti comuni vengono assemblate con Python, senza dipendenze aggiuntive.
Non serve conservare la chat originale per capire dove intervenire.

| Cosa vuoi cambiare | Dove si modifica |
| --- | --- |
| Testi, immagini, pulsanti e sezioni della home | `.github/cad3d-site/pages/it/index.html` |
| Home inglese | `.github/cad3d-site/pages/en/index.html` |
| Una pagina specifica | `.github/cad3d-site/pages/it/` e la corrispondente pagina in `en/` |
| Nomi, indirizzi e ordine delle voci dei menu | `.github/cad3d-site/navigation.json` |
| Struttura di testata, menu mobile, footer e ingrandimenti | `.github/cad3d-site/components/it/` e `en/` |
| Allineamenti, spazi e comportamento responsive dei menu | `cad3d-preview/assets/navigation.css` |
| Apertura, chiusura, tastiera e focus dei menu | `cad3d-preview/assets/navigation.js` |
| Grafica delle altre sezioni | `cad3d-preview/assets/style.css` |
| Anteprime dei tour e Villa Ciani | Pagine `tour-virtuali.html`, CSS `tour-previews-v13.css`, immagini in `assets/` |
| Titolo SEO, descrizione, canonical e anteprima social | `<head>` del file sorgente della pagina |

Ogni pagina contiene commenti `SEZIONE:` per individuare subito la parte da cambiare.
I nomi dei file pubblici restano quelli esistenti. Le pagine sono elencate in
`.github/cad3d-site/pages.json`; la presenza nel registro non obbliga a inserirle nel menu.

Puoi chiedere, per esempio:

> Nel repository Monitep/cad3d-ai-tools, leggi AGENTS.md e CLAUDE.md.
> Nella home CAD3D modifica il testo della sezione PRESENTAZIONE con questo testo: …
> Aggiorna anche l'inglese, ricostruisci le pagine e verifica desktop e telefono.

Dopo la modifica, dalla cartella principale del repository:

```sh
python3 .github/tools/build-cad3d-preview.py
python3 .github/tools/build-cad3d-preview.py --check
python3 .github/tools/check-cad3d-preview.py
node --check cad3d-preview/assets/navigation.js
node --check cad3d-preview/assets/site.js
```

Il primo comando aggiorna le pagine pubblicabili. Gli altri controllano che sorgenti
e pagine coincidano, che le risorse e le ancore esistano, che non ci siano ID duplicati
e che il cambio lingua porti alla stessa pagina. Non verificano la destinazione dei link
esterni o l'aspetto grafico, che va controllato nel browser. `qa.html` permette di
confrontare le pagine a 360, 412, 768, 1024, 1025 e 1280 px.

Le modifiche passano per un ramo Git e una pull request. L'integrazione in `main`
avvia il workflow esistente di pubblicazione FTP su Aruba nell'area `/ai/`.
Il workflow verifica i file CAD3D prima del caricamento. La cronologia Git conserva
le versioni precedenti; il ripristino si fa ripristinando un commit e ripubblicando.

L'anteprima rimane `noindex`. Il nuovo sito pubblico usa il namespace
`/_cad3d-site/`; WordPress gestisce ancora pagine residue. I tour esistenti
restano sui loro URL. Il workflow selettivo non modifica instradamento,
database, informativa, tracciatori o cartelle dei tour.

Istruzioni tecniche: [.github/cad3d-site/README.md](.github/cad3d-site/README.md).
