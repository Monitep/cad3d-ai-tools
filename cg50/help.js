/* Original documentation, not a reproduction of the Casio manual. */
export function coverage(lang) {
  const L = (it, en) => (lang === "it" ? it : en);
  return [
    [
      "RUN / MATRIX",
      L(
        "Aritmetica, frazioni razionali, trigonometria, iperboliche, logaritmi, potenze, complessi, liste, variabili A–Z, calculus numerico, matrici, vettori, bitwise.",
        "Arithmetic, rational fractions, trigonometry, hyperbolics, logarithms, powers, complex numbers, lists, A–Z variables, numerical calculus, matrices, vectors, bitwise.",
      ),
    ],
    [
      "GRAPH / DYNA",
      L(
        "Fino a 3 funzioni cartesiane, polari o parametriche; disuguaglianze y≥f(x)/y≤f(x), trace, pan/zoom, radici, estremi, intersezioni, integrale, derivata, tangente, parametro animato a.",
        "Up to 3 Cartesian, polar or parametric functions; inequalities y≥f(x)/y≤f(x), trace, pan/zoom, roots, extrema, intersections, integral, derivative, tangent, animated parameter a.",
      ),
    ],
    [
      "3D GRAPH",
      L(
        "Una superficie z=f(x,y), una sfera o un cilindro; rotazione e zoom. Non sono disponibili intersezioni o sezioni 3D e viste multiple simultanee.",
        "One z=f(x,y) surface, sphere or cylinder; rotation and zoom. No 3D intersections, cross sections or simultaneous multiple objects.",
      ),
    ],
    [
      "EQUATION",
      L(
        "Polinomi di grado 2–6 (anche radici complesse), sistemi lineari quadrati fino a 20 incognite, ricerca numerica di radici in intervallo.",
        "Degree 2–6 polynomials (including complex roots), square linear systems up to 20 unknowns, numerical root search in an interval.",
      ),
    ],
    [
      "STATISTICS",
      L(
        "Statistiche a una variabile; istogramma; regressioni lineare, polinomiale 1–4, logaritmica, esponenziale e potenza; grafico dati e fit; test Z/t a una media e relativi intervalli.",
        "One-variable statistics; histogram; linear, polynomial 1–4, logarithmic, exponential and power regressions; data and fit plot; one-sample mean Z/t tests and intervals.",
      ),
    ],
    [
      "DISTRIBUTION",
      L(
        "Normale, binomiale, Poisson, geometrica, t, χ² e F. PDF/PMF e CDF, intervalli (eccetto geometrica), inverse per distribuzioni continue.",
        "Normal, binomial, Poisson, geometric, t, χ² and F. PDF/PMF and CDF, intervals (except geometric), inverse for continuous distributions.",
      ),
    ],
    [
      "FINANCIAL",
      L(
        "Interesse semplice, PMT/FV, piano di ammortamento, NPV/IRR, tassi nominale/effettivo, margine/ricarico, giorni reali, deprezzamento lineare.",
        "Simple interest, PMT/FV, amortization schedule, NPV/IRR, nominal/effective rates, margin/markup, actual days, straight-line depreciation.",
      ),
    ],
    [
      "TABLE / RECURSION",
      L(
        "Tabelle fino a 2 funzioni e 2001 righe. Ricorrenze simultanee a(n+1), b(n+1), fino a 1000 passi; grafici e CSV.",
        "Tables with up to 2 functions and 2001 rows. Simultaneous a(n+1), b(n+1) recurrences, up to 1000 steps; graphs and CSV.",
      ),
    ],
    [
      "CONICS / GEOMETRY",
      L(
        "Cerchio, ellisse, parabola e iperbole con assi allineati. Segmenti e poligoni con vertici trascinabili, distanza, punto medio, pendenza, area e perimetro. Non è un sistema di costruzione geometrica vincolata.",
        "Axis-aligned circle, ellipse, parabola and hyperbola. Segments and polygons with draggable vertices, distance, midpoint, slope, area and perimeter. No constrained geometry construction system.",
      ),
    ],
    [
      "SPREADSHEET",
      L(
        "Foglio A1:E12 con formule, riferimenti, intervalli, controllo circoli e CSV. Senza formattazione condizionale, grafici del foglio o compatibilità con file Casio.",
        "A1:E12 sheet with formulas, references, ranges, circular-reference detection and CSV. No conditional formatting, sheet charts or Casio file compatibility.",
      ),
    ],
    [
      "PYTHON",
      L(
        "CPython via Pyodide con output print, apertura/esportazione .py e interruzione. Richiede rete al primo avvio. Senza casioplot o input interattivo.",
        "CPython via Pyodide with print output, .py open/export and interruption. Initial startup requires a network. No casioplot or interactive input.",
      ),
    ],
    [
      L("ALTRI STRUMENTI", "OTHER TOOLS"),
      L(
        "Conversioni di 11 grandezze; basi 2/8/10/16; simulazione moneta/dado; quaderno di testo.",
        "Conversions for 11 quantities; bases 2/8/10/16; coin/die simulation; plain-text notebook.",
      ),
    ],
    [
      L("NON IMPLEMENTATO", "NOT IMPLEMENTED"),
      L(
        "Emulazione firmware e tastiera identica Casio; BASIC Casio; file .g3m/.g3a/eActivity; Picture Plot; Physium (tavola periodica); E-CON4 e sensori; USB; modalità esame; test statistici a due campioni, χ²/F/ANOVA; regressioni med-med/sinusoidale/logistica; obbligazioni e altri metodi di deprezzamento; solver TVM per N/I/PV; algebra simbolica esatta.",
        "Casio firmware emulation and identical keyboard; Casio BASIC; .g3m/.g3a/eActivity files; Picture Plot; Physium (periodic table); E-CON4 and sensors; USB; exam mode; two-sample, χ²/F/ANOVA statistical tests; med-med/sinusoidal/logistic regressions; bonds and other depreciation methods; TVM solver for N/I/PV; exact symbolic algebra.",
      ),
    ],
  ];
}
export function helpTopics(lang) {
  const L = (it, en) => (lang === "it" ? it : en);
  const p = (t) => `<p>${t}</p>`,
    code = (t) => `<code>${t}</code>`,
    list = (items) => `<ul>${items.map((v) => `<li>${v}</li>`).join("")}</ul>`;
  return [
    {
      id: "start",
      title: L("01 · Inizia in un minuto", "01 · Start in one minute"),
      mode: "calc",
      body:
        p(
          L(
            "Scegli una modalità dal menu a sinistra. Sul telefono apri ☰. Ogni modalità ha il pulsante «Carica esempio»: imposta un caso reale, pronto da modificare. La lingua e il tema si cambiano nella barra in alto.",
            "Choose a mode from the left menu. On a phone, open ☰. Each mode has a “Load example” button: it sets up a working case you can edit. Change language and theme in the top bar.",
          ),
        ) +
        list([
          L(
            "Nel calcolo scientifico usa i tasti senza aprire la tastiera del telefono. Per scrivere o incollare con la tastiera del dispositivo, tocca direttamente il campo formula. Premi EXE o Invio per calcolare.",
            "Use the calculator keys without opening your phone's keyboard. To type or paste with your device keyboard, tap the expression field directly. Press EXE or Enter to calculate.",
          ),
          L(
            "SHIFT seleziona la funzione secondaria indicata sopra il tasto e poi si disattiva. OPTN apre il catalogo.",
            "SHIFT selects the secondary function shown above a key, then turns off. OPTN opens the catalog.",
          ),
          L(
            "S ⇄ D alterna numero e frazione quando disponibile. STO A memorizza l’ultimo risultato in A. Ans riusa l’ultima risposta.",
            "S ⇄ D toggles number and fraction when available. STO A stores the last answer in A. Ans reuses the last answer.",
          ),
          L(
            "La cronologia è cliccabile ed esportabile in CSV. Svuotarla cancella solo la cronologia, non le variabili.",
            "Click history rows to reuse them, or export CSV. Clearing history removes only history, not variables.",
          ),
        ]),
    },
    {
      id: "syntax",
      title: L(
        "02 · Sintassi, precedenze e variabili",
        "02 · Syntax, precedence & variables",
      ),
      mode: "calc",
      body:
        list([
          L(
            "Il separatore decimale è sempre il punto: 1.25. La virgola separa gli argomenti: nCr(10,3).",
            "The decimal separator is always a point: 1.25. Commas separate arguments: nCr(10,3).",
          ),
          L(
            "Operazioni: + - * / ^ !. Esempi: 2^3 = 8, 5! = 120, 2/3+1/6 ≈ 0.833333333333.",
            "Operations: + - * / ^ !. Examples: 2^3 = 8, 5! = 120, 2/3+1/6 ≈ 0.833333333333.",
          ),
          L(
            "Potenze prima del segno meno: -2^2 = -4, mentre (-2)^2 = 4. Usa sempre parentesi per esprimere l’intento.",
            "Powers before unary minus: -2^2 = -4, while (-2)^2 = 4. Use parentheses to express your intent.",
          ),
          L(
            "Costanti: pi, e, i. Sono ammesse moltiplicazioni implicite come 2pi, 3i e 2(3+4), ma * rende le formule più chiare.",
            "Constants: pi, e, i. Implicit multiplication such as 2pi, 3i and 2(3+4) is allowed, but * makes formulas clearer.",
          ),
          L(
            "Assegna una variabile con A=12.5, poi usa A*2. Sono disponibili A–Z. Ans è l’ultimo risultato. Le assegnazioni sono singole, senza più comandi nella stessa riga.",
            "Assign a variable with A=12.5, then use A*2. A–Z are available. Ans is the previous answer. Assignments are single commands; multiple commands in one line are not supported.",
          ),
          L(
            "Nelle formule di grafici/tabelle usa x; nei grafici polari e parametrici usa t. Le variabili del calcolo scientifico non vengono trasferite nelle altre modalità.",
            "Use x in graph/table formulas; use t in polar and parametric plots. Scientific calculator variables are not transferred to other modes.",
          ),
        ]) +
        p(
          L(
            "La potenza usa ^, non **. Puoi usare * e / oppure i simboli × e ÷. Limite: 2000 caratteri per espressione; i calcoli troppo lunghi vengono interrotti.",
            "Powers use ^, not **. You can use * and / or × and ÷. Limit: 2000 characters per expression; calculations that take too long are stopped.",
          ),
        ),
    },
    {
      id: "scientific",
      title: L(
        "03 · Catalogo scientifico e angoli",
        "03 · Scientific catalog & angles",
      ),
      mode: "calc",
      body:
        list([
          `${code("sin(x), cos(x), tan(x), asin(x), acos(x), atan(x), atan2(y,x)")} ${L("rispettano DEG / RAD / GRA. 180° = π rad = 200 grad.", "follow DEG / RAD / GRA. 180° = π rad = 200 grad.")}`,
          `${code("sinh(x), cosh(x), tanh(x), asinh(x), acosh(x), atanh(x)")} ${L("sono funzioni iperboliche; non dipendono da DEG/RAD.", "are hyperbolic functions; they do not depend on DEG/RAD.")}`,
          `${code("log(x), log(x,b), ln(x), log2(x), exp(x)")} ${L("log è in base 10; ln è il logaritmo naturale. log(100)=2, ln(e)=1.", "log is base 10; ln is the natural logarithm. log(100)=2, ln(e)=1.")}`,
          `${code("sqrt(x), cbrt(x), nthRoot(x,n), abs(x), sign(x), round(x,n), floor(x), ceil(x), fix(x), mod(x,y), gcd(a,b), lcm(a,b)")}`,
          `${code("nCr(n,r), nPr(n,r), factorial(n), random(), randomInt(min,max)")} ${L("max è escluso da randomInt. nCr(10,3)=120.", "randomInt excludes max. nCr(10,3)=120.")}`,
          `${code("Pol(x,y), Rec(r,θ)")} ${L("convertono coordinate e restituiscono una coppia. Pol(3,4) → [5,53.13…] in DEG.", "convert coordinates and return a pair. Pol(3,4) → [5,53.13…] in DEG.")}`,
          `${code("dms(d,m,s), toDMS(d)")} ${L("dms(12,30,0)=12.5. Per un valore negativo, il segno va nei gradi.", "dms(12,30,0)=12.5. For a negative angle, put the sign on the degrees.")}`,
          L(
            "NORM: 12 cifre significative. FIX: 6 decimali. SCI: 6 decimali in notazione scientifica. ENG: esponente multiplo di tre. I valori interni sono numeri IEEE-754 a 64 bit.",
            "NORM: 12 significant digits. FIX: 6 decimal places. SCI: 6 decimal places in scientific notation. ENG: exponent is a multiple of three. Internally, values use IEEE-754 64-bit numbers.",
          ),
        ]) +
        p(
          L(
            "S ⇄ D ricostruisce una frazione razionale dal valore numerico. Non è algebra simbolica esatta: √2 rimane un’approssimazione decimale.",
            "S ⇄ D reconstructs a rational fraction from the numeric value. This is not exact symbolic algebra: √2 remains a decimal approximation.",
          ),
        ),
    },
    {
      id: "complex",
      title: L(
        "04 · Complessi, liste e operazioni bitwise",
        "04 · Complex numbers, lists & bitwise",
      ),
      mode: "calc",
      body:
        p(
          L(
            "Scrivi i per l’unità immaginaria.",
            "Use i for the imaginary unit.",
          ),
        ) +
        list([
          `${code("(2+3i)*(1-i)")} → 5+i`,
          `${code("complex(2,3), re(2+3i), im(2+3i), conj(2+3i), abs(3+4i), arg(1+i)")}`,
          L(
            "arg restituisce l’argomento in radianti. Per convertirlo in gradi: arg(1+i)*180/pi.",
            "arg returns the argument in radians. To convert it to degrees: arg(1+i)*180/pi.",
          ),
          `${code("[1,2,3], sum([1,2,3]), mean([2,4,6]), median([1,3,8]), std([1,2,3]), variance([1,2,3]), sort([3,1,2])")}`,
          L(
            "std e variance usano la normalizzazione campionaria predefinita; la modalità Statistica mostra separatamente σx e sx.",
            "std and variance use the default sample normalization; Statistics displays σx and sx separately.",
          ),
          `${code("bitAnd(12,10), bitOr(12,10), bitXor(12,10), bitNot(12), leftShift(3,2), rightArithShift(12,2)")}`,
        ]),
    },
    {
      id: "calculus",
      title: L(
        "05 · Derivate, integrali e sommatorie",
        "05 · Derivatives, integrals & sums",
      ),
      mode: "calc",
      body:
        list([
          `${code('diff("x^2",2)')} → 4`,
          `${code('intg("x^2",0,3)')} → 9`,
          `${code('sigma("n^2",1,10)')} → 385`,
        ]) +
        p(
          L(
            "La formula interna va tra doppi apici. diff e intg usano x; sigma usa n e limiti interi. La derivata usa differenze finite; l’integrale usa Simpson adattivo. Non sono operazioni simboliche. In presenza di discontinuità, singolarità o oscillazioni rapide suddividi il dominio e verifica il risultato. Limite di sigma: 10001 termini.",
            "The inner formula must be in double quotes. diff and intg use x; sigma uses n and integer bounds. Differentiation uses finite differences; integration uses adaptive Simpson. These are numerical operations. For discontinuities, singularities or rapid oscillations, split the domain and verify the result. sigma limit: 10001 terms.",
          ),
        ),
    },
    {
      id: "graph",
      title: L(
        "06 · Grafici 2D e tutorial dinamico",
        "06 · 2D graphs & dynamic tutorial",
      ),
      mode: "graph",
      body:
        list([
          L(
            "1. Carica l’esempio: Y1=a*sin(x), Y2=cos(x), intervallo −2π…2π; l’esempio imposta RAD.",
            "1. Load the example: Y1=a*sin(x), Y2=cos(x), interval −2π…2π; the example sets RAD.",
          ),
          L(
            "2. Muovi il cursore a: l’ampiezza di Y1 cambia. Premi «Anima a» per una scansione continua; premi «Ferma» per interrompere.",
            "2. Move slider a: Y1 amplitude changes. Press “Animate a” for a continuous sweep; press “Stop” to stop it.",
          ),
          L(
            "3. Trascina il piano per spostarti, usa la rotella o +/− per lo zoom. «Adatta» stima il campo visibile dai punti campionati.",
            "3. Drag the plane to pan, scroll or use +/− to zoom. “Fit” estimates the view from sampled points.",
          ),
          L(
            "4. Passa il puntatore per leggere un punto di Y1. Il trace seleziona il punto campionato più vicino, non un valore esatto.",
            "4. Move the pointer to read a Y1 point. Trace selects the nearest sampled point, not an exact value.",
          ),
          L(
            "5. Scegli radici, estremi, integrale, derivata/tangente oppure intersezioni Y1/Y2. Le analisi richiedono Y1 cartesiana. La derivata usa il campo «Punto x».",
            "5. Choose roots, extrema, integral, derivative/tangent or Y1/Y2 intersections. Analysis requires Cartesian Y1. Differentiation uses the “Point x” field.",
          ),
          L(
            "6. Esporta PNG per salvare il grafico.",
            "6. Export PNG to save your graph.",
          ),
        ]) +
        p(
          L(
            "Grafico polare: r(t)=2*cos(3*t), RAD, t da 0 a 2*pi (inserisci i limiti come numeri, 0 e 6.283185307). Parametrico: x(t)=3*cos(t), y(t)=2*sin(t). Le disuguaglianze ombreggiano sopra/sotto f(x). La ricerca delle radici è numerica e non garantisce completezza; i grafici sono campionati e possono omettere dettagli fini.",
            "Polar plot: r(t)=2*cos(3*t), RAD, t from 0 to 2*pi (enter numeric bounds, 0 and 6.283185307). Parametric: x(t)=3*cos(t), y(t)=2*sin(t). Inequalities shade above/below f(x). Root searches are numerical and do not guarantee completeness; sampled plots may omit fine detail.",
          ),
        ),
    },
    {
      id: "3d",
      title: L("07 · Grafici 3D", "07 · 3D graphs"),
      mode: "graph3d",
      body:
        p(
          L(
            "Scegli z=f(x,y), una sfera o un cilindro. Per z=f(x,y), il parametro «Semilato del dominio» determina x,y tra −r e +r. Una buona superficie di prova è 0.3*(x^2-y^2).",
            "Choose z=f(x,y), a sphere or a cylinder. For z=f(x,y), “Domain half-width” sets x,y from −r to +r. A good test surface is 0.3*(x^2-y^2).",
          ),
        ) +
        p(
          L(
            "Trascina per ruotare e usa la rotella per lo zoom. La superficie è una griglia wireframe, non un modello CAD. La formula rispetta la modalità angolare globale. Per la sfera r è il raggio; per il cilindro il raggio è 0.6r e l’altezza è 2r.",
            "Drag to rotate and scroll to zoom. The surface is a wireframe grid, not a CAD model. Formula angles follow the global angle setting. For a sphere r is the radius; for a cylinder the radius is 0.6r and height is 2r.",
          ),
        ),
    },
    {
      id: "equations",
      title: L("08 · Equazioni e sistemi", "08 · Equations & systems"),
      mode: "equations",
      body:
        list([
          L(
            "Polinomio: inserisci coefficienti dal grado più alto al termine noto, compresi gli zeri. 1,-3,2 rappresenta x²−3x+2=0 e restituisce 1 e 2.",
            "Polynomial: enter coefficients from highest degree to constant, including zeros. 1,-3,2 means x²−3x+2=0 and returns 1 and 2.",
          ),
          L(
            "Radici complesse: 1,0,1 rappresenta x²+1=0 e restituisce ±i. Gradi supportati: 2–6.",
            "Complex roots: 1,0,1 represents x²+1=0 and returns ±i. Supported degrees: 2–6.",
          ),
          L(
            "Sistema: A=[2,1;1,-1], b=5,1 risolve 2x+y=5, x−y=1. Risultato: x=2, y=1.",
            "System: A=[2,1;1,-1], b=5,1 solves 2x+y=5, x−y=1. Result: x=2, y=1.",
          ),
          L(
            "Numerica: f(x)=x^2-2, intervallo 0…3 dà √2≈1.41421356237. Per un’equazione f=g inserisci f-g.",
            "Numerical: f(x)=x^2-2 on 0…3 gives √2≈1.41421356237. For f=g enter f-g.",
          ),
        ]) +
        p(
          L(
            "Le radici multiple o molto vicine e le matrici mal condizionate possono ridurre l’accuratezza. Prova a riscalare i coefficienti e verifica sostituendo le soluzioni nella formula iniziale.",
            "Repeated or closely spaced roots and ill-conditioned matrices may reduce accuracy. Try rescaling coefficients and verify by substituting solutions into the original formula.",
          ),
        ),
    },
    {
      id: "matrix",
      title: L("09 · Matrici e vettori", "09 · Matrices & vectors"),
      mode: "matrix",
      body:
        p(
          L(
            "Scrivi [1,2;3,4]: virgole per colonne, punto e virgola per righe. Per questa matrice det=-2 e inv=[-2,1;1.5,-0.5]. Sono disponibili trasposta, traccia, somma, sottrazione, prodotto e potenza intera non negativa. Matrici fino a 20×20.",
            "Write [1,2;3,4]: commas for columns, semicolons for rows. For this matrix det=-2 and inv=[-2,1;1.5,-0.5]. Transpose, trace, addition, subtraction, multiplication and nonnegative integer powers are available. Matrices up to 20×20.",
          ),
        ) +
        p(
          L(
            "Vettori: A=1,2,3, B=4,5,6. Prodotto scalare=32, prodotto vettoriale=[-3,6,-3], norma di A=√14. Il prodotto vettoriale richiede tre componenti.",
            "Vectors: A=1,2,3, B=4,5,6. Dot product=32, cross product=[-3,6,-3], norm of A=√14. Cross product requires three components.",
          ),
        ),
    },
    {
      id: "stats",
      title: L("10 · Statistica e regressione", "10 · Statistics & regression"),
      mode: "stats",
      body:
        p(
          L(
            "Dati separati da virgole, spazi o ;. «Una variabile» restituisce n, somma, somma dei quadrati, media, mediana, min/max, quartili, σx della popolazione, sx del campione e varianza campionaria. I quartili usano interpolazione lineare; altre calcolatrici possono usare convenzioni diverse.",
            "Separate data with commas, spaces or ;. “One variable” returns n, sum, sum of squares, mean, median, min/max, quartiles, population σx, sample sx and sample variance. Quartiles use linear interpolation; other calculators may use different conventions.",
          ),
        ) +
        p(
          L(
            "Esempio 2,4,4,4,5,5,7,9: media 5, σx=2, sx≈2.13809. Il grafico è un istogramma con classi automatiche.",
            "Example 2,4,4,4,5,5,7,9: mean 5, σx=2, sx≈2.13809. The plot is a histogram with automatic bins.",
          ),
        ) +
        p(
          L(
            "Regressione: X e Y devono avere la stessa lunghezza. Modelli: lineare, polinomiale (grado 1–4), logaritmico, esponenziale e potenza. Vengono mostrati formula e R² nel dominio originale di Y. Logaritmico/potenza richiedono X>0; esponenziale/potenza richiedono Y>0. Il fit usa minimi quadrati, con trasformazione logaritmica per i modelli esponenziale e potenza.",
            "Regression: X and Y must have the same length. Models: linear, polynomial (degree 1–4), logarithmic, exponential and power. The formula and R² in the original Y domain are displayed. Logarithmic/power require X>0; exponential/power require Y>0. Fitting uses least squares, with logarithmic transformation for exponential and power models.",
          ),
        ),
    },
    {
      id: "inference",
      title: L("11 · Test Z/t e intervalli", "11 · Z/t tests & intervals"),
      mode: "stats",
      body:
        p(
          L(
            "In Statistica scegli «Test e intervallo di confidenza». Inserisci dati indipendenti, media ipotizzata μ₀ e livello di confidenza, per esempio 0.95. Per Z devi indicare la deviazione standard nota della popolazione; per t viene usata sx del campione.",
            "In Statistics, select “Test & confidence interval”. Enter independent observations, hypothesized mean μ₀ and confidence level, such as 0.95. For Z provide the known population standard deviation; t uses sample sx.",
          ),
        ) +
        p(
          L(
            "Il risultato include statistica del test, p bilaterale e unilaterali, intervallo bilaterale della media e gradi di libertà per t. Per il test t, il campione deve essere compatibile con le ipotesi di normalità, soprattutto se piccolo. La modalità implementa test a un campione, non a due campioni.",
            "Results include the test statistic, two-sided and one-sided p values, two-sided mean interval and t degrees of freedom. The t test requires suitable normality assumptions, especially with small samples. This mode implements one-sample tests, not two-sample tests.",
          ),
        ),
    },
    {
      id: "distribution",
      title: L(
        "12 · Distribuzioni e probabilità",
        "12 · Distributions & probability",
      ),
      mode: "distribution",
      body:
        p(
          L(
            "Normale: μ e σ>0. Binomiale: n intero, 0≤p≤1. Poisson: λ>0. Geometrica: 0<p≤1, X parte da 1 e conta le prove fino al primo successo. t e χ²: df>0. F: df₁,df₂>0.",
            "Normal: μ and σ>0. Binomial: integer n, 0≤p≤1. Poisson: λ>0. Geometric: 0<p≤1, X starts at 1 and counts trials until the first success. t and χ²: df>0. F: df₁,df₂>0.",
          ),
        ) +
        list([
          L(
            "PDF/PMF: densità per continue, probabilità puntuale per discrete. CDF: P(X≤x).",
            "PDF/PMF: density for continuous variables, point probability for discrete variables. CDF: P(X≤x).",
          ),
          L(
            "Intervallo: differenza tra CDF. Per le discrete gli estremi interi sono inclusi.",
            "Interval: difference between CDFs. For discrete distributions integer endpoints are included.",
          ),
          L(
            "Inversa: quantile per probabilità 0<p<1, disponibile per normale, t, χ² e F.",
            "Inverse: quantile for probability 0<p<1, available for normal, t, χ² and F.",
          ),
          L(
            "Esempio: normale standard CDF(1.96)≈0.975002. Binomiale n=10,p=0.5, PMF(3)=0.1171875.",
            "Example: standard normal CDF(1.96)≈0.975002. Binomial n=10,p=0.5, PMF(3)=0.1171875.",
          ),
        ]) +
        p(
          L(
            "Nel catalogo scientifico: normalPDF(x,mu,sd), normalCDF(x,mu,sd), normalInv(p,mu,sd), binomialPDF(k,n,p), binomialCDF(k,n,p), poissonPDF(k,lambda), poissonCDF(k,lambda).",
            "In the scientific catalog: normalPDF(x,mu,sd), normalCDF(x,mu,sd), normalInv(p,mu,sd), binomialPDF(k,n,p), binomialCDF(k,n,p), poissonPDF(k,lambda), poissonCDF(k,lambda).",
          ),
        ),
    },
    {
      id: "finance",
      title: L("13 · Finanza e tutorial mutuo", "13 · Finance & loan tutorial"),
      mode: "finance",
      body:
        list([
          L(
            "1. Scegli «Piano di ammortamento»: capitale 100000, tasso 3.5%, 240 periodi e 12 periodi/anno.",
            "1. Choose “Amortization schedule”: principal 100000, rate 3.5%, 240 periods and 12 periods/year.",
          ),
          L(
            "2. Calcola: rata mensile circa 579.96. La tabella separa interessi, capitale e residuo.",
            "2. Calculate: monthly payment about 579.96. The table separates interest, principal and remaining balance.",
          ),
          L(
            "3. Esporta CSV per aprire il piano in un foglio di calcolo. Spese, assicurazioni e imposte non sono incluse.",
            "3. Export CSV to open the schedule in a spreadsheet. Fees, insurance and taxes are excluded.",
          ),
        ]) +
        p(
          L(
            "TVM: usa la convenzione dei segni dei flussi. PV positivo e FV=0 producono PMT negativo. Il campo PMT serve separatamente a calcolare FV; il risultato mostra sia la rata che estingue il capitale verso FV, sia il FV ottenuto usando la rata da te indicata. n conta i periodi di pagamento, non gli anni. Pagamenti a inizio/fine periodo selezionabili.",
            "TVM: use cash-flow sign conventions. Positive PV and FV=0 produce negative PMT. The PMT input is used separately to calculate FV; the result shows both the payment solving for the target FV, and the FV produced by your entered payment. n counts payment periods, not years. Beginning/end-of-period payments are selectable.",
          ),
        ) +
        p(
          L(
            "Interesse semplice: I=capitale*tasso/100*giorni/base. Base positiva, solitamente 360 o 365. Flussi: inserisci t=0 (investimento negativo), poi flussi equidistanti. NPV include t=0. IRR è una ricerca numerica limitata; in presenza di più cambi di segno possono esistere più soluzioni.",
            "Simple interest: I=principal*rate/100*days/basis. Positive basis, usually 360 or 365. Cash flows: enter t=0 (negative investment), then equally spaced flows. NPV includes t=0. IRR is a bounded numerical search; multiple sign changes may give multiple solutions.",
          ),
        ) +
        p(
          L(
            "Conversione tassi: il risultato «effettivo» interpreta l’input come nominale; il risultato «nominale» lo interpreta come effettivo. Margine=(prezzo-costo)/prezzo; ricarico=(prezzo-costo)/costo. Giorni: differenza reale, esclude il giorno iniziale. Deprezzamento: quota lineare (costo-residuo)/vita utile.",
            "Rate conversion: the “effective” result interprets input as nominal; the “nominal” result interprets it as effective. Margin=(price-cost)/price; markup=(price-cost)/cost. Days: actual difference, excluding the start date. Depreciation: straight-line charge (cost-salvage)/useful life.",
          ),
        ),
    },
    {
      id: "table",
      title: L("14 · Tabelle e CSV", "14 · Tables & CSV"),
      mode: "table",
      body:
        p(
          L(
            "Inserisci Y1 e facoltativamente Y2. Specifica inizio, fine e passo numerici. Il passo può essere negativo se procedi dall’alto verso il basso. Massimo 2001 righe. L’unità angolare è quella selezionata nel calcolo scientifico; l’esempio imposta RAD. I punti fuori dominio vengono indicati n/d.",
            "Enter Y1 and optionally Y2. Set numeric start, end and step. The step can be negative for a descending table. Maximum 2001 rows. The angle unit follows the scientific calculator; the example sets RAD. Points outside the domain are marked n/a.",
          ),
        ) +
        p(
          L(
            "Esempio: x² da −5 a 5, passo 1. Grafico e tabella si aggiornano con «Genera». Il CSV usa il punto decimale e la virgola come delimitatore.",
            "Example: x² from −5 to 5, step 1. “Generate” updates graph and table. CSV uses a decimal point and comma delimiter.",
          ),
        ),
    },
    {
      id: "recursion",
      title: L("15 · Successioni e Fibonacci", "15 · Sequences & Fibonacci"),
      mode: "recursion",
      body:
        p(
          L(
            "Le formule usano n, a e b (valori al passo precedente), aggiornati simultaneamente. Fibonacci: a(n+1)=a+b, b(n+1)=a, a(0)=0, b(0)=1. Ottieni 0,1,1,2,3,5,… per a(n).",
            "Formulas use n, a and b (previous-step values), updated simultaneously. Fibonacci: a(n+1)=a+b, b(n+1)=a, a(0)=0, b(0)=1. This gives 0,1,1,2,3,5,… for a(n).",
          ),
        ) +
        p(
          L(
            "Per una sola successione lascia vuota la formula b. Esempio geometrico: a(n+1)=1.05*a, a(0)=100. La riga n=0 è sempre inclusa. Massimo 1000 passi; overflow numerico restituisce un errore.",
            "For a single sequence, leave the b formula empty. Geometric example: a(n+1)=1.05*a, a(0)=100. Row n=0 is always included. Maximum 1000 steps; numeric overflow returns an error.",
          ),
        ),
    },
    {
      id: "geometry",
      title: L("16 · Coniche e geometria", "16 · Conics & geometry"),
      mode: "geometry",
      body:
        p(
          L(
            "Coniche: centro/vertice (h,k), parametri positivi. Cerchio: r=a. Ellisse: semiassi a,b. Parabola: (x-h)²=4a(y-k). Iperbole: (x-h)²/a²-(y-k)²/b²=1. Non sono supportate rotazioni dei propri assi.",
            "Conics: center/vertex (h,k), positive parameters. Circle: r=a. Ellipse: half-axes a,b. Parabola: (x-h)²=4a(y-k). Hyperbola: (x-h)²/a²-(y-k)²/b²=1. Rotation of their own axes is unsupported.",
          ),
        ) +
        p(
          L(
            "Geometria: inserisci punti in ordine x,y; x,y; … e premi «Disegna e misura». Con due punti ottieni un segmento, con tre o più un poligono chiuso. I vertici si trascinano. Il triangolo 0,0;4,0;4,3 ha area 6 e perimetro 12. Le prime due coordinate definiscono distanza, punto medio e pendenza AB.",
            "Geometry: enter ordered points x,y; x,y; … and press “Draw & measure”. Two points form a segment; three or more form a closed polygon. Vertices can be dragged. Triangle 0,0;4,0;4,3 has area 6 and perimeter 12. The first two coordinates define distance, midpoint and slope AB.",
          ),
        ) +
        p(
          L(
            "Area: formula dei lacci, adatta a poligoni semplici. Per poligoni autointersecanti può restituire un’area algebrica priva del significato atteso. I punti non sono vincolati geometricamente.",
            "Area uses the shoelace formula for simple polygons. Self-intersecting polygons may give an algebraic area that does not match expectations. Points have no geometric constraints.",
          ),
        ),
    },
    {
      id: "units",
      title: L(
        "17 · Unità, basi e applicazioni",
        "17 · Units, bases & applications",
      ),
      mode: "units",
      body:
        p(
          L(
            "Scegli la grandezza, le unità e il valore. Esempi: 1 m=100 cm; 1 m²=10000 cm²; 0°C=32°F; 1 kWh=3.6 milioni di J. gallon è il gallone statunitense.",
            "Choose a quantity, units and value. Examples: 1 m=100 cm; 1 m²=10000 cm²; 0°C=32°F; 1 kWh=3.6 million J. gallon is the US gallon.",
          ),
        ) +
        p(
          L(
            "Basi: 2,8,10,16. Esempio 255 decimale → FF esadecimale → 11111111 binario. Le cifre vengono validate e il risultato è esatto solo entro l’intervallo intero sicuro di 53 bit. Numeri negativi con segno meno, non complemento a due.",
            "Bases: 2,8,10,16. Example 255 decimal → FF hexadecimal → 11111111 binary. Digits are validated; exact results are limited to the safe 53-bit integer range. Negative numbers use a minus sign, not two’s complement.",
          ),
        ) +
        p(
          L(
            "Applicazione architettura: atan(0.30/3.00) in DEG dà la pendenza angolare di una rampa ≈5.710593°. Il rapporto percentuale è 0.30/3.00*100=10%.",
            "Architecture example: atan(0.30/3.00) in DEG gives a ramp angle of ≈5.710593°. The slope percentage is 0.30/3.00*100=10%.",
          ),
        ),
    },
    {
      id: "sheet",
      title: L("18 · Foglio di calcolo", "18 · Spreadsheet"),
      mode: "sheet",
      body:
        p(
          L(
            "Foglio A1:E12. Ogni cella accetta un numero o una formula preceduta da =. Esempi: =A1+B1, =sqrt(A1), =sum(A1:A5), =mean(A1:B3). Le funzioni usano nomi inglesi minuscoli. I risultati appaiono sotto le formule dopo «Ricalcola».",
            "A1:E12 sheet. Each cell accepts a number or a formula starting with =. Examples: =A1+B1, =sqrt(A1), =sum(A1:A5), =mean(A1:B3). Function names use lowercase English. Results appear below formulas after “Recalculate”.",
          ),
        ) +
        p(
          L(
            "Le celle vuote valgono zero; il testo libero non è ammesso. I riferimenti sono interni al foglio. I riferimenti circolari danno un errore, senza bloccare l’interfaccia. Non è supportata la copia con riferimenti relativi/assoluti. CSV esporta i valori calcolati dopo un calcolo riuscito, altrimenti il contenuto delle celle.",
            "Empty cells are zero; free text is not supported. References stay within the sheet. Circular references give an error without blocking the interface. Relative/absolute reference copying is unsupported. CSV exports calculated values after a successful run, otherwise raw cell contents.",
          ),
        ),
    },
    {
      id: "python",
      title: L(
        "19 · Python, file e interruzione",
        "19 · Python, files & interruption",
      ),
      mode: "python",
      body:
        p(
          L(
            "Scrivi codice CPython con print(). Al primo avvio viene scaricato il runtime Pyodide da jsDelivr; richiede internet e può impiegare alcuni secondi. Le esecuzioni successive riusano il runtime, con uno spazio delle variabili nuovo per ogni esecuzione.",
            "Write CPython code with print(). First run downloads Pyodide from jsDelivr; it needs internet and may take several seconds. Subsequent runs reuse the runtime with a fresh variable namespace for each run.",
          ),
        ) +
        p(code("from math import sqrt") + "<br>" + code("print(sqrt(2))")) +
        p(
          L(
            "«Apri .py» carica un file locale; «.py ↓» esporta lo script. Tab inserisce quattro spazi. «Interrompi» termina il worker anche se il programma è in un ciclo infinito. Limiti: script 100 kB, output visualizzato 100 kB, esecuzione 90 secondi, incluso il primo scaricamento.",
            "“Open .py” loads a local file; “.py ↓” exports the script. Tab inserts four spaces. “Stop” terminates the worker even if the script is in an infinite loop. Limits: 100 kB script, 100 kB displayed output, 90 seconds per run including first download.",
          ),
        ) +
        p(
          L(
            "È CPython, non MicroPython Casio. casioplot e input interattivo non sono disponibili. Il runtime standard è nel browser e può accedere alle capacità web attraverso Pyodide: esegui solo codice di cui conosci il contenuto. Le formule normali e il codice non sono inviati a un server di calcolo.",
            "This is CPython, not Casio MicroPython. casioplot and interactive input are unavailable. The runtime runs in the browser and can access web capabilities through Pyodide: run code whose contents you understand. Normal formulas and code are not sent to a calculation server.",
          ),
        ),
    },
    {
      id: "storage",
      title: L(
        "20 · Dati, privacy, esportazione ed errori",
        "20 · Data, privacy, export & errors",
      ),
      body:
        p(
          L(
            "Lingua, tema, espressione, ultime 80 voci di cronologia, variabili, parametri, foglio, script e quaderno vengono salvati nel localStorage di questo browser, su questo dispositivo. Non esiste sincronizzazione tra computer e telefono. In navigazione privata o quando la memoria è bloccata il salvataggio può non funzionare. Cancellare i dati del sito rimuove questi contenuti.",
            "Language, theme, expression, last 80 history entries, variables, parameters, sheet, script and notebook are saved in this browser’s localStorage on this device. There is no computer/phone synchronization. Saving may not work in private mode or with blocked storage. Clearing site data removes this content.",
          ),
        ) +
        p(
          L(
            "Esporta CSV/PNG/.py/.txt per conservare i risultati. L’app non aggiunge analytics o richieste verso servizi di calcolo. I normali file dell’app sono serviti da cad3d.expert; Python carica il runtime da jsDelivr, che riceve una normale richiesta di rete.",
            "Export CSV/PNG/.py/.txt to keep your work. The app adds no analytics or requests to calculation services. Normal app files are served by cad3d.expert; Python loads its runtime from jsDelivr, which receives an ordinary network request.",
          ),
        ) +
        p(
          L(
            "Errori comuni: parentesi non chiuse; uso della virgola come separatore decimale; variabili non definite; matrice singolare; dominio reale non valido; intervalli min≥max; passi con segno errato. Alcuni messaggi tecnici delle librerie sono in inglese. Un calcolo che supera 6 secondi viene interrotto, lasciando l’interfaccia utilizzabile.",
            "Common errors: unclosed parentheses; decimal commas; undefined variables; singular matrix; invalid real domain; min≥max intervals; wrong step sign. Some technical library diagnostics are in English. A calculation exceeding 6 seconds is stopped while the interface remains usable.",
          ),
        ),
    },
    {
      id: "coverage",
      title: L(
        "21 · Copertura e differenze rispetto alla FX-CG50",
        "21 · Coverage & differences from the FX-CG50",
      ),
      body:
        p(
          L(
            "Questa è una calcolatrice web indipendente ispirata alle modalità della FX-CG50, non un emulatore ufficiale Casio. Non riproduce tutte le funzioni del firmware. La tabella è la copertura effettiva di questa versione.",
            "This is an independent web calculator inspired by FX-CG50 modes, not an official Casio emulator. It does not reproduce every firmware function. The table shows this release’s actual coverage.",
          ),
        ) +
        `<div class="table-scroll"><table class="data-table coverage-table"><thead><tr><th>${L("Area", "Area")}</th><th>${L("Funzioni e limiti", "Functions & limits")}</th></tr></thead><tbody>${coverage(
          lang,
        )
          .map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`)
          .join("")}</tbody></table></div>` +
        p(
          L(
            "Riferimenti ufficiali per confrontare il comportamento del dispositivo:",
            "Official references for comparing device behavior:",
          ) +
            ' <a href="https://www.casio.com/intl/scientific-calculators/product.FX-CG50/" target="_blank" rel="noopener">Casio FX-CG50</a> · <a href="https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v360_EN.pdf" target="_blank" rel="noopener">Software User’s Guide 3.60</a>.',
        ),
    },
  ];
}
