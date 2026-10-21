#!/usr/bin/env python3
"""Assemble the CAD3D preview from readable HTML and shared navigation. Stdlib only."""
import argparse
import difflib
import html
import json
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[1]
OUTPUT = ROOT / "cad3d-preview"
TOKEN = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def read_json(name):
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))


def render(template, values):
    def replace(match):
        key = match[1]
        if key not in values:
            raise ValueError(f"Unknown template token: {key}")
        return str(values[key])
    return TOKEN.sub(replace, template)


def component(name, lang, values):
    return render((SOURCE / "components" / lang / f"{name}.html").read_text(encoding="utf-8").strip(), values)


def build_pages():
    settings = read_json("settings.json")
    registry = read_json("pages.json")
    navigation = read_json("navigation.json")
    links = navigation["links"]
    groups = navigation["groups"]
    results = {}
    declared = {page["file"] for page in registry}

    def page_url(href):
        url = urlsplit(href)
        query = [(key, value) for key, value in parse_qsl(url.query) if key != "v"]
        query.append(("v", str(settings["preview_version"])))
        return urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), url.fragment))

    for key, link in links.items():
        url = urlsplit(link["href"])
        if url.scheme or url.netloc or url.path not in declared:
            raise ValueError(f"Navigation link {key!r} must point to a registered local page")
        for lang in ("it", "en"):
            if not link["label"].get(lang):
                raise ValueError(f"Missing {lang} navigation label for {key}")

    for page in registry:
        filename = page["file"]
        if Path(filename).name != filename or not filename.endswith(".html"):
            raise ValueError(f"Invalid page filename: {filename}")
        for lang in ("it", "en"):
            asset_prefix = "assets/" if lang == "it" else "../assets/"
            version = page_url(filename)
            switch_url = ("en/" if lang == "it" else "../") + version
            values = {**settings, "asset_prefix": asset_prefix, "language_url": html.escape(switch_url, quote=True)}

            def link_html(key, group=""):
                link = links[key]
                label = link.get("labels", {}).get(group, link["label"])[lang]
                # A link to a subsection is not the current page link.
                active = urlsplit(link["href"]).path == filename and not urlsplit(link["href"]).fragment
                current = ' aria-current="page"' if active else ""
                return f'<a href="{html.escape(page_url(link["href"]), quote=True)}"{current}>{html.escape(label)}</a>'

            for name, keys in groups.items():
                if len(keys) != len(set(keys)):
                    raise ValueError(f"Duplicate navigation item in {name}")
                values[name + "_links"] = "\n".join(link_html(key, name) for key in keys)
            values["services_link"] = link_html("services")
            primary = []
            for key in groups["primary"]:
                primary.append(component("services", lang, values) if key == "services" else link_html(key, "primary"))
            values["primary_links"] = "\n".join(primary)
            for name in ("header", "mobile-menu", "footer", "lightbox"):
                values[name.replace("-", "_")] = component(name, lang, values)
            template = SOURCE / "pages" / lang / filename
            output = OUTPUT / ("en" if lang == "en" else "") / filename
            if output in results:
                raise ValueError(f"Duplicate output page: {output}")
            document = render(template.read_text(encoding="utf-8"), values)
            if TOKEN.search(document):
                raise ValueError(f"Unresolved token in {template}")
            results[output] = document.rstrip() + "\n"

    qa = render((SOURCE / "qa.html").read_text(encoding="utf-8"), settings)
    results[OUTPUT / "qa.html"] = qa.rstrip() + "\n"
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if published HTML differs from source; write nothing")
    args = parser.parse_args()
    results = build_pages()
    stale = []
    for path, expected in results.items():
        actual = path.read_text(encoding="utf-8") if path.exists() else ""
        if actual == expected:
            continue
        if args.check:
            stale.append(str(path.relative_to(ROOT)))
            print("".join(difflib.unified_diff(actual.splitlines(True), expected.splitlines(True), fromfile=str(path.relative_to(ROOT)), tofile="rebuilt from source", n=2))[:3500])
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, encoding="utf-8")
    if stale:
        raise SystemExit("Generated HTML is out of date. Run python .github/tools/build-cad3d-preview.py")
    print(f"{'Verified' if args.check else 'Built'} {len(results) - 1} IT/EN pages and the responsive preview.")


if __name__ == "__main__":
    main()
