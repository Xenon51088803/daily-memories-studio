# Project maintenance

This repository contains reusable code and newly authored examples only.

- Never commit personal `src/content/site.json`, `public-quotes.json`, original photos, uploads, diary databases, configuration, credentials, backups, logs or `.tools`.
- `npm ci` creates missing local content from the tracked examples; setup must never overwrite existing owner data.
- Preserve the upstream CC BY-NC 4.0 license and third-party notices. Do not describe this as MIT or unrestricted commercial software.
- Run relevant tests and verify static export for changes affecting publication. Keep the editor and private diary out of static exports.
- The owner has requested that future code changes also be committed and pushed to the configured GitHub source remote after verification. Check the diff and staged file list first; never force-push or add ignored files.
- Source synchronization uses Git. Publishing personal website content is a separate action using `npm run publish:web`; do not put personal content into the source repository to synchronize it.
- The public template must not include visit tracking. The owner's existing access statistics must remain enabled through ignored local extensions. Never delete or publish those extension files or their credentials.

Owner extensions use ignored `src/content/local-extensions.tsx` and `scripts/local-export.mjs`; fresh clones initialize empty versions from the tracked examples. Shared layout/editor/export code exposes these extension slots so source updates do not overwrite the owner's private integrations.

The repository's source remote and the generated GitHub Pages repository must remain separate.
