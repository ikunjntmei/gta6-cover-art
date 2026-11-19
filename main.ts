// Vice City Cover Studio — the entrypoint for gta6-cover-art-01 (Node 22,
// standard library only). The grader runs this file; all it does is hand in
// the finished work: copy the offline web app in app/ and the screenshots in
// screenshots/ into the output directory, then write dossier.json there with
// the vendored make.fun library, so the judge can read the entry.
//
// Run it locally to check the handoff:
//   mkdir -p /tmp/vc-out && MAKEFUN_OUTPUT_DIR=/tmp/vc-out node main.ts
// (without MAKEFUN_OUTPUT_DIR it writes to /output, the grader's directory.)

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this file lives in is the repository root.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn(folder) {
  const from = join(repoRoot, folder);
  const to = join(outputDir, folder);
  if (!existsSync(from)) return;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
handIn('app');
handIn('screenshots');

// The caps the scorer enforces (reference/gate.json in the kit): at most
// 160 KiB of dossier text, at most 4 screenshots of at most 256 KiB each,
// app/ at most 993 files and 48 MiB in total, no app/ path over 1000 bytes.
// buildDossier refuses the handoff if any of them is breached, so a bad
// entry fails here, loudly, instead of silently reaching the judge.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
