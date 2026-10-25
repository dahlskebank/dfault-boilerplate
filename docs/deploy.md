# Deploy

One-click sync from local `_site/` to a webhotel via lftp + SFTP key auth.
The current setup targets Domeneshop's shared webhotel layout but works against
any SFTP host — only the values in `.env` change.

## Run a deploy

From any terminal in the project root:

```bash
npm run deploy
```

Runs `npm run build` (lint:css → lint:js → clean → Eleventy → html-validate →
check:refs → minify) and then `./deploy.sh _site`, which `lftp mirror`s the
build output to the remote folder, **deleting any remote files that no longer
exist locally** (except the remote-only files listed in
[`EXCLUDES`](#remote-only-files-excludes)). If any build step fails, the deploy
never starts.

The build's `clean` step deletes `_site/` first, so stale pages from a renamed
or deleted source file can't reach the server. Side effect: Laragon answers 404
for a second or two while the build runs.

### Skip the build

```bash
./deploy.sh _site
```

This uploads whatever is in `_site/` right now. **Only do this straight after a
successful `npm run build`** with no saves since. If `eleventy --watch` has run
in between, `_site/` holds its output instead: not cleaned (stale pages
included), not minified, not validated and not reference-checked. When in
doubt, use `npm run deploy`.

### Preview what would happen (no changes)

```bash
DRY_RUN=1 ./deploy.sh _site
```

Shows every upload + remove that would happen, without touching the server. Use
this whenever you're nervous, especially on a new project before the very first
real deploy.

### From VS Code

`Ctrl+Shift+P` → `Tasks: Run Task` → `Deploy`. Runs `npm run deploy` in your
default terminal; npm then runs the script in Git Bash because `.npmrc` sets
`script-shell`. `.vscode/tasks.json` is tracked in git, so every clone has the
task.

### Additive upload without lftp (`npm run deploy:batch`)

lftp needs a real terminal. In a shell without one (Claude Code's, for one) it
fails its prompt and hangs. For those, `scripts/deploy-batch.mjs` builds a plain
`sftp` batch instead:

```bash
npm run build
npm run deploy:batch        # same as: node scripts/deploy-batch.mjs
```

It writes `_temp/deploy/deploy.batch` (one `-mkdir` per folder, one `put` per
file) and prints the `sftp -b …` command that uploads it, run from the project
root. It is **additive**: it overwrites and adds, and **never deletes**. A file
you removed from the build stays on the server until the next real
`npm run deploy`.

- It reads the exclude list straight out of `deploy.sh` (the active
  `EXCLUDES+=` lines) and applies lftp's own matching rules, so both deploy
  paths skip exactly the same remote-only files. There is no second list to
  keep in sync.
- It refuses the same targets `deploy.sh` refuses (see
  [Target checks](#target-checks)): an additive upload can't delete, but it
  can still overwrite another site's `index.html`.
- It leak-checks the finished batch before writing it. **Only use the batch
  when the script exits 0 and prints `leak? clean`.** On any failure it writes
  nothing, and it removes the batch from an earlier run first.
- It lists any file that exists in `_site/` but is excluded and therefore NOT
  uploaded (see the `google*.html` note below).

`_temp/` is gitignored. The batch is a build artefact: regenerate it, never
edit or commit it.

## Files involved

| File | Purpose |
|------|---------|
| `deploy.sh` | The lftp wrapper. Reads `.env`, checks the target, runs `mirror --reverse --delete --no-perms` with the `EXCLUDES` list. |
| `scripts/deploy-batch.mjs` | Builds the additive sftp batch (`npm run deploy:batch`) from `_site/` and `deploy.sh`'s `EXCLUDES`. |
| `.env` | Holds `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_REMOTE`, optional `DEPLOY_KEY` and the two optional switches. **Gitignored.** |
| `.env.example` | Template, committed. |
| `.npmrc` | `script-shell=...bash.exe` so `npm run deploy` works from cmd/PowerShell on Windows. On Linux/CI, override it with `NPM_CONFIG_SCRIPT_SHELL=/bin/bash`. |
| `.vscode/tasks.json` | VS Code task `Deploy` (`npm run deploy`). Tracked in git. It has no `options.shell` of its own: `.npmrc` already picks the shell. |
| `package.json` | The `deploy` and `deploy:batch` npm scripts. |
| `~/.ssh/config` | (Optional, this machine only) Per-host `IdentityFile` so direct `ssh user@host` from a terminal also works without `-i`. |
| `~/.ssh/known_hosts` | The server's host key, recorded on the first connection (see [Host key](#host-key)). |

## `.env` keys

| Key | Required | What it does |
|-----|----------|--------------|
| `DEPLOY_HOST` | yes | SFTP host, e.g. `login.domeneshop.no`. |
| `DEPLOY_USER` | yes | SFTP username. |
| `DEPLOY_REMOTE` | yes | The site's folder on the server, e.g. `/home/N/x/user/yourdomain.tld`. No trailing slash, no `~`, `.` or `..`. |
| `DEPLOY_KEY` | no | Private key path in Git Bash form, e.g. `/e/www/your_key`. Default `~/.ssh/id_ed25519`. |
| `DEPLOY_ALLOW_PATH_MISMATCH` | no | `1` = allow a `DEPLOY_REMOTE` whose last folder isn't named after the domain. See [Target checks](#target-checks). |
| `DEPLOY_STRICT_HOSTKEY` | no | `1` = only connect when the host key is already in `known_hosts`. See [Host key](#host-key). |

`deploy.sh` reads `.env` as plain text and accepts **only these keys**. Any
other line (`PATH=…`, `HOME=…`) is skipped with a warning, so a planted `.env`
can't swap in a fake `lftp` or `ssh`.

## SSH key (one-time, applies to all projects)

The deploy uses an SSH key. Generate one in Git Bash:

```bash
ssh-keygen -t ed25519 -C "your@email"
# Press Enter through all three prompts (default path, empty passphrase x2)
```

Default location: `~/.ssh/id_ed25519`. If you save it somewhere else (e.g.
`/e/www/your_key`), set `DEPLOY_KEY` in `.env` to that path. **Avoid spaces in
the path** — they break the embedded ssh command in `deploy.sh`. Keep the
passphrase empty (or load the key into ssh-agent): the deploy runs ssh with
`BatchMode=yes`, which never asks for a passphrase or password.

Copy the public key:

```bash
clip < ~/.ssh/id_ed25519.pub      # adjust path if you saved elsewhere
```

Add it to your hosting account. **For Domeneshop**, the cleanest method is to SSH
in with password once and append manually:

```bash
ssh DEPLOY_USER@DEPLOY_HOST
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PASTE_THE_PUBLIC_KEY_LINE_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

Substitute the actual public key contents on the `echo` line — pasting a
placeholder literally is the most common copy-paste failure.

Test:

```bash
ssh DEPLOY_USER@DEPLOY_HOST 'echo ok'
```

Should print `ok` without prompting for a password.

### Host key

The very first `ssh DEPLOY_USER@DEPLOY_HOST` on a machine shows the server's
host key fingerprint and asks whether to trust it. If your host publishes its
fingerprints, compare before you answer `yes`. ssh then records the key in
`~/.ssh/known_hosts`.

`deploy.sh` leaves this policy to ssh, where you can see it, with
`StrictHostKeyChecking=accept-new`: a server it has never seen is trusted and
recorded; a server whose key has **changed** is refused (that's what a
man-in-the-middle looks like). It used to be lftp's `sftp:auto-confirm yes`,
which typed "yes" for you, unseen.

To pin the key instead (refuse any server not already in `known_hosts`), set
`DEPLOY_STRICT_HOSTKEY=1` in `.env` after the first connection. If the deploy
then fails with `Host key verification failed` although plain `ssh` works,
lftp is running a different ssh build with its own `known_hosts`: run one
`DRY_RUN=1 ./deploy.sh _site` without the switch (that records the key where
lftp's ssh looks), then turn it back on.

### Timeouts

`deploy.sh` sets `net:timeout 30` (give up on a connection silent for 30 s;
lftp's default is 5 minutes) and `net:max-retries 3` (default 1000). Together
with `BatchMode=yes` and `IdentitiesOnly=yes`, a bad key or a dead connection
now fails within a couple of minutes with an error, instead of hanging on an
invisible password prompt or retrying for days.

## Setup checklist for a new project derived from this boilerplate

Start the project the README's way ("Starting a new site": clone, then detach
the boilerplate remote). Then:

1. `deploy.sh` must be executable. git stores it that way (mode 100755), so
   a clone keeps it, and Git Bash on Windows runs it through its `#!` line
   anyway. Only after a plain folder copy on Linux/WSL: `chmod +x deploy.sh`.
2. Set the real domain as `url` in `src/_data/site.json`. `deploy.sh` refuses
   to deploy while it is still `https://example.com`.
3. Copy `.env.example` to `.env` and fill in per-project values. The last
   folder of `DEPLOY_REMOTE` must be named after that domain (see
   [Target checks](#target-checks)).
4. Review the `EXCLUDES` list in `deploy.sh` for this project (see
   [Remote-only files](#remote-only-files-excludes)).
5. **Always run a dry-run first** to confirm the path is right:
   ```bash
   DRY_RUN=1 ./deploy.sh _site
   ```
6. Look for any "Removing extra file" / "Removing extra subdirectory" lines that
   surprise you. If there are none, or only files you expect to be removed, the
   real deploy is safe. A file on the `EXCLUDES` list must never appear there.

## Target checks

`mirror --delete` makes the folder in `DEPLOY_REMOTE` identical to `_site/`. A
`.env` copied from another project, or a path missing its last folder
(`/home/N/x/user` instead of `/home/N/x/user/yourdomain.tld`), would replace or
delete **another** site. So before lftp runs (dry-runs included) `deploy.sh`
refuses:

- a `site.json` `url` that is still the `example.com` placeholder;
- a `DEPLOY_REMOTE` with a trailing `/`, an empty folder (`//`), or a `~`, `.`
  or `..` folder;
- an absolute `DEPLOY_REMOTE` fewer than `MIN_REMOTE_SEGMENTS` (3) folders deep,
  which looks like an account root rather than a site folder;
- a `DEPLOY_REMOTE` whose last folder is neither the site's host nor its first
  label. Both of these pass:

  | `site.json` url | `DEPLOY_REMOTE` |
  |-----------------|-----------------|
  | `https://mysite.no` | `/home/N/x/user/mysite.no` |
  | `https://app.mysite.no` | `/home/N/x/user/subs/app` |

If the docroot really is named differently (a host's `www` or `public_html`
folder), set `DEPLOY_ALLOW_PATH_MISMATCH=1` in `.env` and run a dry-run before
the real deploy. The switch only skips the name check: the other checks still
apply. Note that it can't tell `/home/N/x/user` (the whole account) from a site
folder, which is one more reason for the dry-run. On a chrooted SFTP host whose
docroot is just `/www` or `/htdocs`, lower `MIN_REMOTE_SEGMENTS` in that
project's `deploy.sh`.

It also checks the **built** files for template values the build only warns
about (the boilerplate itself is full of them and must keep building), and
refuses when:

- `robots.txt` or `.well-known/security.txt` still contains `example.com` or
  `yoursite.com` (`site.json` `url`, `security.contact`);
- security.txt's `Expires:` is less than 30 days away or has passed (an expired
  security.txt is invalid);
- the home page still says `Your Name` or `yoursite.com` (`site.json`
  `footer.copyrightName` / `copyrightUrl`).

`scripts/deploy-batch.mjs` runs all of these checks too.

## Remote-only files (`EXCLUDES`)

Some files only ever live on the server. `mirror --delete` would remove them on
the next deploy, because they aren't in `_site/`. The `EXCLUDES` list in
`deploy.sh` protects them: lftp leaves anything matching an `--exclude-glob`
alone on **both** sides, so it is neither uploaded nor deleted. The list is the
one source of truth; `scripts/deploy-batch.mjs` reads it too.

Active by default:

| Pattern | Protects |
|---------|----------|
| `.htpasswd*` | Basic Auth password files, created on the server. |
| `google*.html` | A Search Console HTML verification file uploaded by hand. |
| `BingSiteAuth.xml` | A Bing Webmaster Tools verification file uploaded by hand. |
| `.well-known/acme-challenge/*` | Let's Encrypt HTTP-01 tokens, if the host writes them into the docroot. |

Commented examples ready to switch on: `_config/paths.php` (per-environment
runtime config, see the README's `.data/` section), `api/data/*` (data the live
site writes itself), `cgi-bin/*` (cPanel hosts create it inside `public_html`).
Add one `EXCLUDES+=" --exclude-glob '<pattern>'"` line per path, then check with
`DRY_RUN=1` that it no longer shows up in the "Removing" lines.

How lftp matches a pattern (checked with lftp 4.9.2):

- **No `/` in the pattern:** matched against the file or folder *name*, in every
  folder. `.htpasswd*` protects `/.htpasswd` and `/members/.htpasswd-site`
  alike.
- **With `/`:** matched against the *end* of the path, as many folders deep as
  the pattern is. `.well-known/acme-challenge/*` protects that folder and
  everything in it.
- **Never start a pattern with `/`.** It then matches nothing at all.
- **An exclude only protects files inside folders that also exist in `_site/`.**
  A remote folder that is missing locally is removed whole (`rm -r`), excluded
  files included. (`.well-known/` is safe: the build always writes
  `.well-known/security.txt`.)
- **Excluded files are not uploaded either.** A `google*.html` that is part of
  the build would never reach the server.

### Search Console (and other) verification files

In order of preference:

1. **DNS verification** (a "Domain" property in Search Console): one TXT record
   at the DNS host, nothing on the web server to lose, and it covers every
   subdomain and both http and https.
2. **Upload the HTML file by hand** over SFTP into the docroot. The
   `google*.html` exclude keeps it there through every deploy.
3. **Commit it to the project.** Then it's part of every build and doesn't
   need the exclude, so comment out the `google*.html` line in `deploy.sh`,
   or it will never be uploaded. Don't drop Google's `.html` file straight into
   `src/`: Eleventy treats it as a template and writes it to
   `/google<id>/index.html`. A passthrough copy writes the right file but still
   builds that extra page as well. Instead, create `src/google<id>.njk`:
   ```
   ---
   permalink: /google<id>.html
   eleventyExcludeFromCollections: true
   ---
   google-site-verification: google<id>.html
   ```
   with the body copied exactly from the file Google gave you.

## Safety notes

- **`mirror --delete` is destructive.** `deploy.sh` checks the target (see
  [Target checks](#target-checks)), but still sanity-check `DEPLOY_REMOTE` and
  dry-run before the first deploy on a new project.
- **`deploy.sh` refuses to run if `_site/index.html` is missing.** This catches
  the "build failed silently and `_site/` is empty" disaster, which would
  otherwise wipe the entire live site via `--delete`.
- **Always dry-run before a deploy you're nervous about.** Watch for
  "Removing extra file" / "Removing extra subdirectory" lines that don't match
  what you expect.
- **Don't start a second deploy while one is running.** The `flock` guard in
  `deploy.sh` only works where `flock` exists (Linux, WSL). Git for Windows
  doesn't ship it, so in Git Bash the guard is skipped and nothing stops two
  deploys racing inside `mirror --delete`.
- **Never commit `.env`.** It's gitignored, but verify before any first commit
  involving deploy changes.
- **If the SSH key file leaks**, anyone with it gets your SFTP account. Don't
  sync `~/.ssh/` (or wherever your key lives) to cloud storage.
- **Subdomains live in separate folders** on Domeneshop, so deploying the main
  site won't touch e.g. `media.example.com`. (This may differ on other hosts.)
- **Never upload `_site/` by hand** (FileZilla, WinSCP, drag-and-drop). That
  bypasses every exclude and check above. Use `npm run deploy` or
  `npm run deploy:batch`.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `lftp: command not found` | Install with `choco install lftp -y` from an admin PowerShell. |
| The connection fails, and lftp only says something vague (`max-retries exceeded`, `Login failed`) | Ask ssh directly: `ssh -o BatchMode=yes -o IdentitiesOnly=yes -i /path/to/your_key DEPLOY_USER@DEPLOY_HOST 'echo ok'` (the `DEPLOY_KEY`, `DEPLOY_USER` and `DEPLOY_HOST` values from `.env`; your terminal doesn't have them as variables, only `deploy.sh` reads `.env`). Its error matches one of the next three rows. |
| `Permission denied (publickey…)` | SSH key not registered server-side, OR `DEPLOY_KEY` points at the wrong file, OR the public key on the server is corrupted (line breaks, placeholder pasted literally), OR the key has a passphrase (`BatchMode=yes` can't ask for it). Before `BatchMode`, this showed up as a password prompt that hung the deploy. |
| `Host key verification failed` | The server's key changed (a host migration, or something worse): check with your host before removing the old line from `known_hosts`. With `DEPLOY_STRICT_HOSTKEY=1`: the key isn't in the `known_hosts` lftp's ssh reads, see [Host key](#host-key). |
| Timeouts, then it works on the next try | Some hosts briefly throttle repeated SFTP connections. Just run the deploy again. |
| `chmod -f 750` lines in output | `--no-perms` got dropped from `deploy.sh` somehow — files would be served as 750 and Apache may 403 them. |
| `DEPLOY_HOST contains invalid characters` | Quotes or unexpected chars in `.env`. The script's allowlist rejects values that could break out of the lftp heredoc. |
| `ignoring unknown .env key 'X'` | `.env` has a line `deploy.sh` doesn't use (typo in a key name?). It is skipped. |
| `site.json "url" is still the placeholder` | Set the real domain in `src/_data/site.json`. |
| `still contains example.com / yoursite.com`, `still says 'Your Name'`, `security.txt Expires is N day(s) away` | A template value made it into the build: fix the named `site.json` key (`url`, `security.contact`, `security.expires`, `footer.copyrightName` / `copyrightUrl`) and run `npm run build` again. See [Target checks](#target-checks). |
| `DEPLOY_REMOTE ends in '/x', but site.json says this site is …` | `.env` copied from another project, or the path is missing its last folder. If the folder is right, see [Target checks](#target-checks). |
| `… folder(s) deep — that looks like an account root` | `DEPLOY_REMOTE` is missing the site folder. See [Target checks](#target-checks). |
| `index.html missing — refusing to deploy` | The build did not produce `_site/index.html`. Inspect the build output before retrying. |
| `another deploy is already running` | (Linux/WSL only, where `flock` exists.) Another deploy holds the lock on `.deploy.lock`. The lock dies with that process, so a leftover `.deploy.lock` file on its own never blocks a deploy. |
| `DEPLOY_HOST not set in .env` | Running outside the project root, or `.env` is missing. |
| Files uploaded but missing on the live site | `DEPLOY_REMOTE` pointing at a non-public subfolder. |
| A hand-uploaded file vanished after a deploy | It isn't on the `EXCLUDES` list, or its parent folder doesn't exist in `_site/`. See [Remote-only files](#remote-only-files-excludes). |
| A file in `_site/` never reaches the server | It matches an `EXCLUDES` pattern. `npm run deploy:batch` lists such files. |
