# CAD3D source guide

This directory is the editable source of the 26 CAD3D preview pages (13 Italian,
13 English). The HTML was imported from the published v13 pages, including the
Villa Ciani feature and other tour thumbnails, so rebuilding preserves the latest work.

## Source layout

```text
pages/it/*.html       Italian page content and metadata
pages/en/*.html       English page content and metadata
components/it/       Shared Italian header, mobile menu, footer, lightbox, Services group
components/en/       Shared English components
navigation.json      Local destinations, translated labels and ordered menu groups
pages.json           Registry of page IDs and public filenames
settings.json        Cache versions for shared CSS/JS and the responsive preview
qa.html              Source of the responsive test harness
build.py             Small standard-library HTML assembler
```

Published CSS/JS/media live under `cad3d-preview/assets/`; they are not copied or generated.
`navigation.css` and `navigation.js` own all header/menu rules and interactions.
`style.css` owns the remaining site layout; the tour thumbnail module remains
`tour-previews-v13.css`. Third-party GSAP/Pannellum files are retained as supplied.

## Editing pages and components

Pages are normal readable HTML. Search for `<!-- SEZIONE: … -->` and edit the desired
section. The `<head>` holds each page's title, description, canonical, hreflang,
social metadata and optional page-specific resources. Asset paths are relative to the
published page: `assets/` in Italian, `../assets/` in English.

The four page slots `{{header}}`, `{{mobile_menu}}`, `{{footer}}`, `{{lightbox}}` are
filled from the shared language-specific components. Components use menu slots such as
`{{primary_links}}` and `{{footer_services_links}}`, plus `{{asset_prefix}}` and
`{{language_url}}`. Unknown tokens stop the build. There are no runtime includes or
client-side requests to load shared HTML: every published page is a complete static document.

`navigation.json` has a `links` dictionary keyed by stable IDs. Each entry has one
relative destination (without a cache version) and Italian/English labels. Optional `labels` override a label
for a menu group (for example `Tour` in the top bar, `Tour virtuali e VR` in Services).
The `groups` arrays set order and membership for desktop, mobile and footer. Change
the shared destination once; it then updates every menu using that entry. Links inside
page content are ordinary HTML and must be edited where they appear.

`settings.json` also holds `preview_version`: the assembler appends it to menu and language links.
Page-content links use `?v={{preview_version}}` so a release refreshes their cached HTML too.
Canonical and hreflang URLs keep their existing paths without query parameters.

The assembler computes `aria-current` for page links, the language counterpart URL,
and the asset prefix. Subsection links do not masquerade as the current page.
It escapes menu labels/URLs. Raw HTML belongs in the HTML source, not in a menu label.

To add a page, register its stable ID and filename in `pages.json` and create both
language templates, using a similar existing page as the starting point. Add it to
navigation only when appropriate. The checker flags an unexpected HTML file for review;
it does not delete files. For shared CSS/JS changes, increment the relevant version in
`settings.json` and rebuild all pages. Keep existing public filenames and hash anchors.

## Build, check and publish

Run commands from the repository root; Python 3 and Node are sufficient, with no install step:

```sh
python3 .github/tools/build-cad3d-preview.py
python3 .github/tools/build-cad3d-preview.py --check
python3 .github/tools/check-cad3d-preview.py
node --check cad3d-preview/assets/navigation.js
node --check cad3d-preview/assets/site.js
git diff --check
```

`--check` writes nothing and fails when the tracked HTML differs from its sources.
The structural checker verifies the registry, one H1 per content page, language switch
targets, preview noindex, shared component presence, duplicate IDs, ARIA targets,
local assets (including srcset/mobile images) and fragment anchors.
Browser QA covers appearance and interactions; external URLs need separate checks.

Commit the edited source, directly edited assets and rebuilt HTML together. The
`Check CAD3D preview` action runs on relevant PRs. `Deploy FTP su Aruba` repeats the
checks before the existing FTP upload on main. Internal source lives in `.github/`,
which is excluded from upload, as are the root agent instructions and local preview settings.
Keep the existing FTP server directory and sync behavior; this repository includes unrelated apps.

The authoritative deployment remains GitHub → Aruba, not a new hosting service.
There is no current source/database dependency on Divi. WordPress at the main domain
and the external tour viewers remain separate. This directory is not a complete
inventory or backup of WordPress, its hidden pages or server folders.

## Media and historical notes

Original sources, native dimensions, hashes and generation/editing provenance are
in `.github/tools/CAD3D-CONTENT-ASSETS.json`, `CAD3D-AI-V11-ASSETS.json` and
`CAD3D-MEDIA-ASSETS.json`. Preserve all current media and their links when editing text.
The old notes `CAD3D-PREVIEW.md` and `CAD3D-COMPLETE-HANDOFF.md` retain historical
context. Their older version numbers and generator descriptions are not current build instructions.
