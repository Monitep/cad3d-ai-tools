# Bit Lab per Wear OS

App autonoma senza connessione: conversioni, +, −, ×, ÷ con resto e promemoria. Numeri interi non negativi: ingressi fino a 65535 (16 bit); sottrazione solo se il primo numero è maggiore o uguale al secondo. I risultati di somma e moltiplicazione possono superare 16 bit.

## Installazione da telefono Android

1. Scarica l'APK dalla sezione Artifacts della build GitHub Actions, estrai il file ZIP e copia `app-debug.apk` nella cartella Download del telefono. Serve accesso GitHub al repository per scaricare l'artifact.
2. Installa sul telefono **Wear Installer 2** da Google Play. Segui le istruzioni dell'app per selezionare il file APK personalizzato.
3. Collega telefono e orologio alla stessa rete Wi-Fi. Sul Galaxy Watch apri Impostazioni > Informazioni sull'orologio > Informazioni software; tocca Versione software cinque volte per attivare le opzioni sviluppatore.
4. Nelle opzioni sviluppatore attiva Debug ADB e Debug wireless. Usa l'associazione e l'indirizzo richiesti dall'installatore; i nomi delle voci possono variare secondo la versione di Wear OS.
5. Seleziona l'APK, autorizza la connessione sull'orologio e completa l'installazione. Cerca Bit Lab tra le app.
6. Al termine disattiva Debug wireless e Debug ADB.

In alternativa usa Android Studio o `adb pair`, `adb connect`, `adb install app-debug.apk` dal computer; la porta di associazione può differire da quella di connessione. Non esporre il debug wireless a reti non fidate.

## Compilazione

Con JDK 17, Android SDK 35 e Gradle 8.9: `gradle assembleDebug`. L'APK debug non è firmato per la pubblicazione sul Play Store. Per aggiornamenti successivi, reinstallare versioni firmate con la stessa chiave; le chiavi debug generate su computer diversi possono differire.
