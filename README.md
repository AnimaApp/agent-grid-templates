# Agent Grid templates

The starter projects an agent can create a new Agent Grid artifact from, with the
`artifact-create_from_template` MCP tool. Each top-level template folder becomes the new artifact's
first commit, exactly as it is here.

| Folder          | Template id    | Creates                                                  |
| --------------- | -------------- | -------------------------------------------------------- |
| `react/`        | `react`        | An app: Vite + React 18 + TypeScript, styled with plain CSS |
| `html/`         | `html`         | An app: static HTML, CSS and JavaScript, no build step    |
| `presentation/` | `presentation` | A presentation, in the compiled presentation format       |

The knowledge-base template (`second-brain`) lives in its own repository,
[AnimaApp/second-brain-template](https://github.com/AnimaApp/second-brain-template).

The catalog that maps ids to folders is `ARTIFACT_TEMPLATES` in
`anima-design-to-code/figma/anima-public/shared/src/utils/artifactTemplates.ts`. The Public API reads
this repository's `main` branch through codeload and caches it for ten minutes, so a change merged here
reaches new artifacts within ten minutes, without a deploy. Renaming or removing a folder breaks the
template it serves: change the catalog first.

## Rules for a template folder

- It holds only the artifact's own files. Hidden files (`.gitignore`, `.github/`) and shell or
  executable files are skipped on import, so do not rely on them.
- `react/` previews in Agent Grid's Sandpack runtime: keep `src/main.tsx` as the entry, React 18, and
  plain CSS. Tailwind is supported only partially there, so the template does not use it.
- `html/` must not have a `package.json`: that is what makes Agent Grid treat it as a static site.
- `presentation/` is the compiled presentation format (`presentation.json`, `slides/`, `layouts/`,
  `media/<sha256>.<ext>`). Agent Grid stores its media as LFS objects of the new artifact on create.
  Never edit it by hand: change its source and rebuild (below).

## The presentation template

`presentation/` is built from `presentation-source/`:

- `scripts/presentation/deck.mjs` writes `presentation-source/deck.presentation-ir.json`, an
  agent-written Presentation IR: the theme, the layouts and seven slide patterns (title, agenda,
  section, image and text, key numbers, full-bleed image, closing).
- `scripts/presentation/images.mjs` draws the placeholder images into `presentation-source/images/`.

Rebuild after changing either, with an `anima-design-to-code` checkout whose dependencies are
installed (the presentation compiler is not published):

```sh
scripts/build-presentation.sh ../anima-design-to-code
```

The build compiles the IR with `@animaapp/presentation-compiler`, which lints its own output, lints
it again with the format's lint, and replaces `presentation/`. It is deterministic: the same source
always writes the same bytes.

## Checks

```sh
node scripts/validate.mjs   # structure of every template; also runs in CI
```

CI also installs and builds `react/`.
