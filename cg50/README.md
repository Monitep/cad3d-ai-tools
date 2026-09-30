# CG50 Studio

Calcolatrice scientifica e grafica web di CAD3D.Expert, ispirata alle modalità della Casio FX-CG50. Implementazione indipendente: **non è un emulatore del firmware e non offre parità completa con tutte le funzioni Casio**.

## Avvio e pubblicazione

Applicazione statica, senza build, backend, account o chiavi API.

```sh
python3 -m http.server 8765
```

Aprire `http://localhost:8765/cg50/` dalla radice del repository. Non usare `file://`: moduli ES e worker richiedono HTTP(S).

Il workflow FTP già presente pubblica la cartella dopo il merge autorizzato in `main`. Percorso previsto: `https://cad3d.expert/ai/cg50/`. L'indice esistente riceve una scheda che apre la calcolatrice. Il workflow di deploy non viene modificato.

## Funzioni di questa versione

| Modalità | Copertura |
|---|---|
| Calcolo scientifico | Aritmetica, parentesi, potenze, radici, fattoriali, nCr/nPr, log base 10/naturale/arbitraria, trigonometria DEG/RAD/GRA, iperboliche, complessi, liste, bitwise, Pol/Rec, DMS, variabili A–Z, Ans, cronologia, frazione razionale ricostruita, NORM/FIX/SCI/ENG |
| Calcolo numerico | Derivate, integrali definiti con Simpson adattivo, sommatorie |
| Grafici 2D | Tre curve cartesiane/polari/parametriche, disuguaglianze sopra/sotto f(x), parametro dinamico a, animazione, trace campionato, pan/zoom, radici, estremi, intersezioni, integrale, tangente, PNG |
| Grafici 3D | Una superficie z=f(x,y), una sfera oppure un cilindro; wireframe, rotazione, zoom, PNG |
| Equazioni | Polinomi grado 2–6, radici complesse, sistemi lineari fino a 20 incognite, ricerca di radici in intervallo |
| Matrici / vettori | Determinante, inversa, trasposta, traccia, somma/sottrazione/prodotto/potenza; prodotto scalare/vettoriale, norma |
| Statistica | Statistiche descrittive, istogramma, fit lineare/polinomiale/logaritmico/esponenziale/potenza, R², test Z/t della media a un campione, intervalli bilaterali |
| Distribuzioni | Normale, binomiale, Poisson, geometrica, Student t, χ², F; PDF/PMF, CDF, intervalli, quantili delle continue |
| Finanza | Interesse semplice, TVM PMT/FV, ammortamento, NPV/IRR, tassi nominale/effettivo, margine/ricarico, giorni reali, deprezzamento lineare, CSV |
| Tabelle / successioni | Tabelle a due funzioni, ricorrenze simultanee a/b, grafici, CSV |
| Coniche / geometria | Cerchio/ellisse/parabola/iperbole allineati agli assi; segmenti/poligoni, vertici trascinabili, misure |
| Conversioni | Undici grandezze e basi 2/8/10/16 |
| Foglio di calcolo | A1:E12, formule, riferimenti, intervalli, rilevamento cicli, CSV |
| Simulazione | Moneta equa e dado a sei facce |
| Python | CPython via Pyodide, worker interrompibile, stdout/stderr, file .py |
| Quaderno | Testo semplice, salvataggio locale, .txt, stampa |

La guida interna ha **21 sezioni in italiano e inglese**, ricerca, esempi caricabili e tutorial. Le etichette dei moduli, i testi d'aiuto e le informazioni di copertura cambiano lingua; alcuni errori tecnici delle librerie restano in inglese.

## Differenze e funzioni non implementate

- Nessuna emulazione firmware, tastiera esatta Casio, modalità esame, USB, E-CON4, sensori o formato .g3m/.g3a/eActivity.
- Nessun interprete BASIC Casio, Picture Plot o Physium/tavola periodica.
- Geometria limitata a coordinate di segmenti e poligoni, senza costruzioni vincolate o animazioni geometriche.
- Statistica: non include test a due campioni, χ²/F/ANOVA, regressioni med-med/sinusoidale/logistica, box plot o altri diagrammi statistici Casio.
- Finanza: non include obbligazioni, metodi di deprezzamento diversi dal lineare, né un solver TVM per N/I/PV.
- Python è CPython, non MicroPython Casio; nessun `casioplot`, `input()` interattivo o compatibilità garantita con script della calcolatrice.
- 3D: un oggetto, senza sezioni, intersezioni, rette 3D dedicate o visualizzazione simultanea di più oggetti.
- Non è un CAS. Frazioni e radici sono calcolate numericamente, senza algebra simbolica esatta o visualizzazione Natural-VPAM.

## Precisione e limiti

IEEE-754 double, 12 cifre significative in NORM. I metodi numerici non garantiscono tutte le radici o gli estremi in un intervallo. Integrali con singolarità/discontinuità e polinomi con radici multiple/vicine richiedono verifica indipendente. Le regressioni polinomiali usano equazioni normali: valori X molto grandi o dati mal condizionati riducono l'accuratezza. Quartili con interpolazione lineare.

Limiti: 2000 caratteri e 400 nodi per espressione; matrici 20×20; 2001 righe tabella; 1000 passi ricorsivi; 10001 termini sommatoria; foglio 12×5; 100000 lanci. Ogni richiesta numerica ha un timeout di 6 secondi e il worker viene ricreato dopo un timeout. Generatori di matrici e combinatoria hanno limiti espliciti. Le formule vengono validate nell'AST, con funzioni ammesse esplicitamente; nessun `eval` JavaScript nelle formule.

## Dati e rete

Preferenze, cronologia (80 calcoli), variabili, espressione, parametri dei moduli, foglio, script e quaderno usano il `localStorage` del browser. Non si sincronizzano e possono essere persi cancellando i dati del sito. È possibile esportare il lavoro. Nessun analytics aggiunto dall'app, nessun server di calcolo.

math.js e jStat sono inclusi localmente. Python scarica Pyodide 0.27.7 da jsDelivr quando l'utente avvia uno script: richiede rete, ha un timeout di 90 secondi e un limite di 100 kB per script/output. Gli script Python hanno le capacità offerte da Pyodide e non sono un ambiente sicuro per codice ostile; il pulsante Stop termina il worker. Il resto dell'app non richiede CDN, font remoti o servizi esterni.

## Verifica

```sh
node .github/tests/cg50-engine.test.cjs
```

17 gruppi di test numerici coprono convenzioni Casio, calculus, polinomi fino al grado 6, radici pari, esclusione di poli, matrici, regressioni, distribuzioni, inferenza, finanza, conversioni, foglio e limiti.

Test browser (server HTTP già avviato, Playwright installato):

```sh
npm install --no-save --package-lock=false playwright@1.51.1
npx playwright install chromium
node .github/tests/cg50-ui.cjs
```

`CG50_URL` cambia il server; `CG50_CHROMIUM` indica un browser Chromium già installato. La suite verifica funzionamento, memoria, persistenza, errori, lingua, tema, guida e assenza di overflow orizzontale a 320, 390, 768 e 1440 px. Python è verificato separatamente perché richiede rete. GitHub Actions esegue i test numerici e browser nella PR, senza accedere a secrets FTP.

## Sorgenti di riferimento e dipendenze

- [Specifiche ufficiali Casio FX-CG50](https://www.casio.com/intl/scientific-calculators/product.FX-CG50/).
- [Software User's Guide 3.60](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v360_EN.pdf), usata per confrontare le modalità. La guida dell'app è originale e non riproduce il manuale.
- [math.js 15.2.0](https://mathjs.org/), Apache-2.0, licenza in `vendor/math-LICENSE.txt`. SHA-256 del bundle: `b4de1e31da7797c3daaf7b8dae3b1d8bb0a7296c9cc8590f9359ac0250f8ddd6`.
- [jStat 1.9.6](https://github.com/jstat/jstat), MIT, licenza in `vendor/jstat-LICENSE.txt`. SHA-256: `e478a6ab6324e735d927529b5e97506df97dd3a4ced8c744c8e00b90da95dcc0`.
- [Pyodide 0.27.7](https://pyodide.org/en/0.27.7/), caricato su richiesta.

I marchi Casio e FX-CG50 identificano il prodotto di riferimento. CG50 Studio è un progetto indipendente di CAD3D.Expert.
