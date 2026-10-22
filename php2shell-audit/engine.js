export const BASELINE_DATE='2026-10-22';
export const FIXES={'8.2':35,'8.3':36,'8.4':27,'8.5':12};
export const SOURCES=[
 ['Avviso ufficiale PHP · 21 ottobre 2026','https://www.php.net/archive/2026.php'],
 ['CVE-2026-109618 · OOM corruption','https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w'],
 ['CVE-2026-109619 · Stale global state','https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp'],
 ['Indicazioni operative NCSC-NL','https://github.com/NCSC-NL/php2shell']
];
export function assess(version,source='manual',backport=''){
 const match=/^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(String(version).trim());
 const base={source,version:String(version),backport,baseline:BASELINE_DATE,exploit_tested:false};
 if(!match)return {...base,status:'unknown',title:'Versione non riconosciuta',text:'Inserisci una versione completa, per esempio 8.3.36. Non è possibile concludere lo stato delle patch.',action:'Controlla la versione nel pannello hosting o usa il file diagnostico.'};
 const major=+match[1],minor=+match[2],patch=+match[3],suffix=match[4],branch=major+'.'+minor,minimum=FIXES[branch];
 if(/(?:dev|alpha|beta|RC)/i.test(suffix))return {...base,status:'unknown',title:'Build preliminare da verificare',text:'Il numero di una build di sviluppo non dimostra la presenza delle correzioni.',action:'Verifica il commit di build con il fornitore.'};
 if(minimum!==undefined&&patch>=minimum)return {...base,status:'patched',minimum:branch+'.'+minimum,title:'Versione con le correzioni PHP2Shell',text:'La versione dichiarata raggiunge la release corretta di questo ramo. Questo controllo riguarda le due CVE e non certifica la sicurezza generale del sito.',action:'Verifica che tutti i pool e i nodi usino questa versione e che i processi siano stati riavviati dopo l’aggiornamento.'};
 if(major<8||(major===8&&minor<2))return {...base,status:backport?'backport':'legacy',title:backport?'Backport dichiarato, da verificare':'Ramo PHP precedente alle release corrette',text:'Questo ramo non riceve le release ufficiali indicate nell’avviso. Un provider può distribuire correzioni con un proprio pacchetto.',action:'Chiedi conferma esplicita per entrambe le CVE, identificativo del pacchetto e riavvio dei processi; altrimenti passa a un ramo supportato.'};
 if(minimum!==undefined)return {...base,status:backport?'backport':'update',minimum:branch+'.'+minimum,title:backport?'Backport dichiarato, da verificare':'Versione precedente alla correzione ufficiale',text:'Senza un backport documentato, questa versione va trattata come potenzialmente vulnerabile. La sola configurazione non è una correzione completa.',action:'Aggiorna almeno a '+branch+'.'+minimum+' oppure ottieni dal provider una conferma verificabile della correzione di entrambe le CVE.'};
 return {...base,status:'unknown',title:'Ramo fuori dalla baseline',text:'Questa versione non è compresa nella baseline verificata il 22 ottobre 2026.',action:'Consulta l’avviso PHP aggiornato e la documentazione del fornitore.'};
}
export function validateSnapshot(x){
 if(!x||typeof x!=='object'||x.schema!=='php2shell-runtime/1')throw new Error('Il file non è un report diagnostico PHP2Shell supportato.');
 if(!x.runtime||typeof x.runtime.php_version!=='string'||x.runtime.php_version.length>100||typeof x.runtime.sapi!=='string'||x.runtime.sapi.length>80)throw new Error('Il report non contiene una versione PHP e una SAPI valide.');
 if(!Number.isFinite(Date.parse(x.observed_at)))throw new Error('Data del report non valida.');
 if(!x.config||typeof x.config!=='object'||Array.isArray(x.config))throw new Error('Configurazione del report non valida.');
 const keys=['memory_limit','fatal_error_backtraces','post_max_size','upload_max_filesize','file_uploads','enable_post_data_reading','session.upload_progress.enabled','session.auto_start','session.save_handler'];
 const config={};for(const k of keys){if(k in x.config){if(!['string','boolean'].includes(typeof x.config[k])||String(x.config[k]).length>128)throw new Error('Valore di configurazione non valido.');config[k]=x.config[k];}}
 return {schema:x.schema,observed_at:x.observed_at,nonce:typeof x.nonce==='string'?x.nonce.slice(0,64):'',runtime:{php_version:x.runtime.php_version,sapi:x.runtime.sapi,os:typeof x.runtime.os==='string'?x.runtime.os.slice(0,80):'n/d',zts:!!x.runtime.zts},config};
}
export function validateEndpoint(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||!u.pathname.endsWith('.php'))throw new Error('Usa l’URL HTTPS completo del file .php, senza credenziali, porta, query o frammenti.');return u;
}
export function makePHP({tokenHash,expires,origin}){
 if(!/^[a-f0-9]{64}$/.test(tokenHash)||!Number.isSafeInteger(expires)||!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(origin))throw new Error('Configurazione del file diagnostico non valida.');
 return `<?php
/* PHP2Shell runtime audit. Generated for a one-hour, read-only check.
 * No shell execution, uploads, memory stress or phpinfo(). Remove after use.
 * Requires PHP 5.4+. Token is sent only in X-Audit-Token, never in the URL.
 */
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
$allowed_origin = '${origin}';
$request_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
function audit_fail($status) { http_response_code($status); exit; }
if ($request_origin !== '' && $request_origin !== $allowed_origin) { audit_fail(403); }
if ($request_origin === $allowed_origin) {
  header('Access-Control-Allow-Origin: ' . $allowed_origin);
  header('Vary: Origin');
}
if (time() > ${expires}) { audit_fail(410); }
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') {
  header('Access-Control-Allow-Methods: GET, OPTIONS');
  header('Access-Control-Allow-Headers: X-Audit-Token, X-Audit-Nonce');
  header('Access-Control-Max-Age: 0');
  http_response_code(204); exit;
}
if ($method !== 'GET') { audit_fail(405); }
$token = isset($_SERVER['HTTP_X_AUDIT_TOKEN']) ? $_SERVER['HTTP_X_AUDIT_TOKEN'] : '';
if (!preg_match('/^[a-f0-9]{64}$/D', $token)) { audit_fail(404); }
$expected = '${tokenHash}';
$actual = hash('sha256', $token);
$diff = 0;
for ($i = 0; $i < 64; $i++) { $diff |= ord($expected[$i]) ^ ord($actual[$i]); }
if ($diff !== 0) { audit_fail(404); }
$nonce = isset($_SERVER['HTTP_X_AUDIT_NONCE']) ? $_SERVER['HTTP_X_AUDIT_NONCE'] : '';
if (!preg_match('/^[a-f0-9]{32}$/D', $nonce)) { audit_fail(400); }
$keys = array('memory_limit', 'fatal_error_backtraces', 'post_max_size', 'upload_max_filesize', 'file_uploads', 'enable_post_data_reading', 'session.upload_progress.enabled', 'session.auto_start', 'session.save_handler');
$config = array();
foreach ($keys as $key) { $config[$key] = ini_get($key); }
header('Content-Type: application/json; charset=utf-8');
echo json_encode(array(
  'schema' => 'php2shell-runtime/1',
  'observed_at' => gmdate('c'),
  'nonce' => $nonce,
  'runtime' => array('php_version' => PHP_VERSION, 'sapi' => PHP_SAPI, 'os' => PHP_OS, 'zts' => defined('PHP_ZTS') ? (bool) PHP_ZTS : false),
  'config' => $config
));
`;
}
