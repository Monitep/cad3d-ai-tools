"""Isolated yt-dlp process. Only public-network egress, no cookies or plugins."""
import ipaddress
import json
import os
import socket
import sys
from urllib.parse import urlsplit


def validate_url(url):
    try:
        u = urlsplit(url)
        if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password:
            raise ValueError()
        if u.port not in (None, 80, 443) or '.' not in u.hostname:
            raise ValueError()
        try:
            addr = ipaddress.ip_address(u.hostname)
        except ValueError:
            addr = None
        if addr is not None and (not addr.is_global or addr.is_multicast):
            raise ValueError()
        if u.hostname.lower().endswith(('.local', '.localhost', '.internal')):
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError('Inserisci un link HTTP/HTTPS pubblico, senza credenziali.')
    return url


def public_address(address):
    ip = ipaddress.ip_address(address.split('%')[0])
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    if not ip.is_global or ip.is_multicast:
        raise OSError('Accesso a indirizzi di rete privati non consentito.')


def protect_network():
    original_dns = socket.getaddrinfo
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def dns(host, *args, **kwargs):
        answers = original_dns(host, *args, **kwargs)
        for answer in answers:
            public_address(answer[4][0])
        return answers

    def connect(sock, address):
        if sock.family in (socket.AF_INET, socket.AF_INET6):
            public_address(address[0])
        return original_connect(sock, address)

    def connect_ex(sock, address):
        if sock.family in (socket.AF_INET, socket.AF_INET6):
            public_address(address[0])
        return original_connect_ex(sock, address)

    socket.getaddrinfo = dns
    socket.socket.connect = connect
    socket.socket.connect_ex = connect_ex


def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)


class Logger:
    def debug(self, message):
        pass
    def warning(self, message):
        pass
    def error(self, message):
        pass


def summary(info):
    url = info.get('webpage_url') or info.get('original_url') or info.get('url', '')
    if info.get('ie_key') == 'Youtube' and not url.startswith('http'):
        url = 'https://www.youtube.com/watch?v=' + info['id']
    thumb = info.get('thumbnail') or next((x['url'] for x in reversed(info.get('thumbnails') or []) if x.get('url')), '')
    return {'title': info.get('title') or 'Video', 'url': url,
            'thumbnail': thumb, 'duration': info.get('duration'),
            'channel': info.get('uploader') or info.get('channel') or '',
            'live': bool(info.get('is_live')), 'extractor': info.get('extractor_key', '')}


def main():
    # Clear proxy settings so private proxies cannot bypass network checks.
    for key in list(os.environ):
        if key.lower().endswith('_proxy'):
            del os.environ[key]
    protect_network()
    import yt_dlp
    request = json.loads(sys.stdin.read())
    mode = request['mode']
    limit = int(os.environ.get('MAX_FILE_MB', '2048')) * 1024 * 1024
    options = {'quiet': True, 'no_warnings': True, 'logger': Logger(),
               'noplaylist': True, 'socket_timeout': 20, 'retries': 2,
               'fragment_retries': 2, 'cachedir': False, 'proxy': '',
               'js_runtimes': {'deno': {}}, 'remote_components': set(),
               'hls_prefer_native': True, 'external_downloader': {'default': 'native'},
               'concurrent_fragment_downloads': 1, 'max_filesize': limit,
               'allow_unplayable_formats': False,
               'postprocessor_args': {'ffmpeg_i': ['-protocol_whitelist', 'file,pipe']}}
    target = ('ytsearch8:' + request['query']) if mode == 'search' else validate_url(request['url'])
    if mode == 'search':
        options.update(extract_flat='in_playlist', playlistend=8, noplaylist=False)
    if mode in ('search', 'info'):
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(target, download=False)
            if info.get('_type') in ('playlist', 'multi_video') and mode == 'info':
                raise ValueError('Incolla il link di un singolo video.')
            entries = info.get('entries') or [info]
            emit({'results': [summary(x) for x in entries if x]})
        return

    directory = request['directory']
    last_percent = [-1]
    def progress(data):
        if data['status'] == 'finished':
            emit({'status': 'processing', 'progress': 99})
            return
        total = data.get('total_bytes') or data.get('total_bytes_estimate')
        downloaded = data.get('downloaded_bytes', 0)
        if downloaded > limit or (total and total > limit):
            raise ValueError('Il video supera il limite di dimensione.')
        percent = min(98, int(downloaded / total * 98)) if total else 0
        if percent != last_percent[0]:
            last_percent[0] = percent
            emit({'status': 'downloading', 'progress': percent})
    def preflight(info, *, incomplete=False):
        if info.get('is_live'):
            return 'Le dirette in corso non sono supportate.'
        if (info.get('duration') or 0) > 7200:
            return 'Durata massima: due ore.'
    options.update(outtmpl=directory + '/%(title).100B [%(id)s].%(ext)s',
                   restrictfilenames=True, progress_hooks=[progress],
                   match_filter=preflight, overwrites=False)
    quality = request['quality']
    if quality == 'audio':
        options.update(format='bestaudio/best', postprocessors=[{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}])
    else:
        height = int(quality)
        options.update(format=f'bv*[height<=?{height}]+ba/b[height<=?{height}]',
                       merge_output_format='mp4/mkv')
    class PublicDownloader(yt_dlp.YoutubeDL):
        def process_info(self, info):
            formats = info.get('requested_formats') or [info]
            allowed_protocols = {'http', 'https', 'm3u8', 'm3u8_native', 'http_dash_segments'}
            for fmt in formats:
                if fmt.get('protocol') not in allowed_protocols:
                    raise ValueError('Questo tipo di flusso video non è supportato.')
                validate_url(fmt.get('url', ''))
            return super().process_info(info)

    with PublicDownloader(options) as ydl:
        info = ydl.extract_info(target, download=True)
        if not info or info.get('is_live') or (info.get('duration') or 0) > 7200:
            raise ValueError('Video non scaricabile: diretta o durata oltre due ore.')
    emit({'status': 'done', 'title': info.get('title', 'Video')})


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # No URLs, credentials, or upstream logs in the API response.
        msg = str(error)
        if any(s in msg.lower() for s in ('sign in', 'login', 'cookies', 'private video')):
            reason = 'Il sito richiede un account. Questa versione supporta video pubblici.'
        elif 'drm' in msg.lower():
            reason = 'Video protetto da DRM: download non disponibile.'
        elif 'unsupported' in msg.lower():
            reason = 'Questo link non è supportato da yt-dlp.'
        elif isinstance(error, ValueError):
            reason = msg[:180]
        else:
            reason = 'Il sito non ha consentito il download. Verifica il link e aggiorna il motore yt-dlp.'
        emit({'error': reason})
        sys.exit(1)
