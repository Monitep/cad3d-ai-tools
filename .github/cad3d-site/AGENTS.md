# CAD3D.Expert: editing contract

## Scope and source of truth

- Work only on the requested CAD3D preview changes. The repository is a monorepo.
- The canonical page source is `pages/{it,en}/<filename>.html` in this directory.
- Edit shared markup in `components/{it,en}/`, and menu data in `navigation.json`.
- Edit CSS, JavaScript and media directly in `cad3d-preview/assets/`.
- Build through `.github/tools/build-cad3d-preview.py`, which calls `build.py` here.
  The former Python content generator has been replaced. Do not recreate its old output.
- Commit both source and rebuilt HTML. A generated-only HTML edit fails the drift check.
- Keep Italian and English aligned. Page and component filenames match in both languages.
- A registered page may intentionally be absent from navigation. Do not remove it for that reason.

## Preserve the established project

- Preserve the current page filenames, link destinations, section IDs, media and approved copy
  unless the requested change requires editing them. Preserve Villa Ciani and all six other
  tour previews, all 40 models and the single AI workflow disclosure in the footer.
- Header/menu styling is in `navigation.css`; behavior is in `navigation.js`.
  Avoid adding competing menu rules to the main stylesheet.
- Keep the current preview `noindex`, canonical and hreflang paths. Moving to the root domain,
  changing indexation and migrating WordPress are separate tasks.
- Do not edit the root `index.html`, WordPress, external tour folders or unrelated applications
  as a side effect of a CAD3D change. Do not remove pages because they are not linked in a menu.
- Use the existing static HTML/CSS/JavaScript and Python standard library. A new framework,
  package or paid service is not needed for routine edits.
- Media provenance is documented in `.github/tools/*ASSETS.json`. Preserve originals and
  factual distinctions between photography, CGI and technical output.
- Keep credentials out of source and generated output. Deployment uses existing GitHub secrets.

## Verify and deliver

From the repository root, run:

```sh
python3 .github/tools/build-cad3d-preview.py
python3 .github/tools/build-cad3d-preview.py --check
python3 .github/tools/check-cad3d-preview.py
node --check cad3d-preview/assets/navigation.js
node --check cad3d-preview/assets/site.js
git diff --check
```

Inspect the affected views in a browser. For navigation, check home at the top and after
scrolling, the Services dropdown, Escape and outside-click closure, mobile open/close and
language switching. Use `qa.html` at 360, 768, 1024, 1025 and 1280 px. Confirm text alignment,
no horizontal overflow, an unobscured close button, focus restoration and matching panel/header edges.
Do not report a browser check as passed if the browser could not perform it.

Use a branch and PR scoped to this preview. Follow the user's existing publication authorization;
do not introduce a fresh confirmation gate for routine already-authorized preview updates.
Main pushes use the existing Aruba FTP workflow. Wait for the workflow result and check the
affected published page before reporting publication. Do not claim the WordPress migration is complete.
