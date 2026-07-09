CAD3D 360e - Gallerie panoramiche a tile multirisoluzione
==========================================================

PERCHE' 360e
La versione precedente caricava l'intero panorama (fino a 481MB
di texture GPU per un 120MP): sui telefoni la memoria non basta
e compaiono zone nere, in modo casuale. 360e usa la tecnica dei
viewer professionali (krpano, 3DVista): base leggera immediata +
tile ad alta risoluzione caricati solo per la porzione di sfera
inquadrata. Qualita' piena percepita, pochi MB in GPU, su
qualunque dispositivo.

PRIMO AVVIO
1. https://cad3d.expert/ai/360e/admin/  (password: cad3d360)
2. Cambia subito la password (si salva in data/_admin.php,
   i deploy git non la toccano mai).
3. Crea una galleria e trascina i panorami equirettangolari.

UPLOAD
Il browser genera per ogni panorama: miniatura, base 2048px e
la griglia di tile a piena risoluzione (es. 512 tile da 486px
per un 15520x7760), poi invia tutto a lotti. Per i 120MP
conviene caricare da PC: la preparazione richiede memoria.
L'originale intero viene inviato per ultimo come archivio; se
supera i limiti del server viene saltato senza problemi (il
viewer usa i tile).

LIMITI PHP
Niente php_value in .htaccess (con PHP-FPM di Aruba = errore
500). I limiti sono nel php.ini incluso, copiato anche in
admin/. Se l'invio dell'originale fallisce comunque, i tile
bastano e l'app funziona al 100%.

STRUTTURA DATI
data/_galleries.json           elenco gallerie
data/{slug}/_meta.json         titoli, ordine, dimensioni, griglia
data/{slug}/_thumbs/nome.jpg   miniature 1024px
data/{slug}/base/nome.jpg      base 2048px per avvio immediato
data/{slug}/tiles/nome/c_r.jpg tile alta risoluzione
data/{slug}/nome.jpg           originale (archivio, facoltativo)

La cartella data/ non viene mai toccata dai deploy git.
