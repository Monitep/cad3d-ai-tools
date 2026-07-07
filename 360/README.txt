CAD3D Panorami 360 - Istruzioni Deploy
=======================================

STRUTTURA DOPO L'UNZIP
-----------------------
Questo ZIP contiene la cartella "360/" con tutta l'applicazione.
Fai unzip e carica il contenuto della cartella 360/ sul tuo FTP
nella posizione dove vuoi che sia raggiungibile.

Esempio: se vuoi che sia su https://cad3d.expert/360/
   carica i file in /www.cad3d.expert/360/ sul FTP Aruba.

Se vuoi che sia su https://cad3d.expert/ai/360/
   carica in /www.cad3d.expert/ai/360/


PRIMO AVVIO
-----------
1. Vai su https://tuodominio.it/360/admin/
2. Password di default: cad3d360
3. Vai subito su "Cambia password" e impostane una sicura.
4. Crea la prima galleria e inizia a caricare panorami.


LIMITE UPLOAD SU ARUBA
-----------------------
Il file .htaccess tenta di alzare i limiti PHP.
Se l'upload di file grandi fallisce, prova anche a copiare
il file php.ini in /360/ e in /360/admin/ sul server.
Su Aruba shared, il php.ini locale spesso funziona anche
quando .htaccess non ha effetto.

Valori configurati: 200MB per file, 210MB per post, 512MB memoria.


COME FUNZIONA L'UPLOAD DI FILE 120MP
--------------------------------------
Il browser genera la miniatura (1024x512) PRIMA di inviare il file.
Su file molto grandi (>50MP) questo può richiedere 3-5 secondi
di elaborazione locale. La barra di progresso appare dopo.
Non chiudere il browser durante l'upload.


STRUTTURA CARTELLE
------------------
360/
   index.php            Galleria pubblica (lista gallerie)
   gallery.php          Lista panorami di una galleria
   view.php             Visore sferico fullscreen
   config.php           Configurazione (password hash)
   lib.php              Funzioni condivise
   assets/style.css     CSS globale
   data/                Immagini e metadati (scrivibile)
      _galleries.json   Lista gallerie con nomi
      [slug-galleria]/  Una cartella per galleria
         _meta.json     Titoli e ordine immagini
         _thumbs/       Miniature generate dal browser
         immagine.jpg   Originali equirettangolari
   admin/               Pannello admin (richiede login)
   .htaccess            Limiti PHP e protezioni
   php.ini              Alternativa ai limiti se .htaccess non basta


SICUREZZA
---------
- La cartella data/ blocca l'esecuzione PHP e il listing directory.
- I file _meta.json e _galleries.json non sono accessibili via HTTP.
- Le immagini originali sono accessibili via URL diretto (necessario
  per il visore sferico che le deve caricare nel browser).
  Se vuoi proteggere anche la visione dei panorami, aggiungi
  un controllo sessione in view.php.


AGGIORNAMENTI FUTURI
--------------------
Per aggiornare il codice mantenendo i dati:
- Sostituisci tutti i file PHP tranne config.php.
- La cartella data/ non va mai sovrascritta.

AGGIORNAMENTO V2
----------------
- FIX: upload multiplo non si interrompe più dopo il primo file
- FIX: rimossi php_value da .htaccess (con PHP-FPM di Aruba
  causavano errore 500). I limiti sono solo nel php.ini.
  NON sono certo che Aruba onori il php.ini locale su tutti i
  piani: se l'upload di file >32MB fallisce, verifica dal
  pannello Aruba se puoi alzare i limiti PHP da lì.
- La password admin ora si salva in data/_admin.php: i deploy
  git futuri NON la resettano più.
- Riordino panorami anche da telefono (frecce su/giù nelle card)
- Viewer: percentuale reale di download, zoom, schermo intero,
  rotazione automatica, contatore posizione, giroscopio on/off
