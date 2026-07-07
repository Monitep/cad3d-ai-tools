<?php
// ============================================================
// CAD3D Panorami 360 - Configurazione
// ============================================================
// IMPORTANTE: cambia subito la password al primo deploy.
// Vai su admin/login.php, fai login con la password di default,
// poi clicca "Cambia password" nel dashboard.
// ============================================================

return [
    // Titolo mostrato in tutte le pagine pubbliche
    'site_title' => 'CAD3D Panorami 360°',

    // Sottotitolo galleria pubblica
    'site_subtitle' => 'Visualizzazione immersiva impianti rinnovabili',

    // Hash della password admin.
    // Password di default: cad3d360
    // Da cambiare immediatamente dopo il primo login.
    'admin_password_hash' => '$2b$10$7JnbzcloR1AWVugZUb7N.utHbC.IQ1AYywTijsP8AB1CyRv4lo6b6',

    // Limite massimo dimensione file in MB (deve essere coerente con .htaccess)
    'max_upload_mb' => 200,

    // Larghezza thumbnail generata dal browser prima dell'upload
    'thumb_width' => 1024,
];
