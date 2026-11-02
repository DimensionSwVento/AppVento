#!/usr/bin/env bash
# RQ2 (frontend): clean + every frontend defect of the corpus manifest, B then P, sequentially
# (sequential on purpose: durations are an outcome of the experiment). RESUMABLE: re-running skips
# every condition run already written (results/frontend/runs/<id>-<B|P>.json, written atomically) and
# every defect whose results/frontend/<id>.json is complete; an interrupted run is simply redone.
#
#   rq2-frontend-run-all.sh <corpus dir> <worktree B> <worktree P> <raw dir> [id ...]
#
# Env: RQ2_FORCE=1 re-runs even if results exist.
# At the end it regenerates results/frontend/<id>.json + summary rows (rq2-frontend-summarize.mjs --append-summary).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CORPUS="$1"; WB="$2"; WP="$3"; RAW="$4"; shift 4
OUT="$CORPUS/results/frontend/runs"
mkdir -p "$OUT" "$RAW"
rm -f "$OUT"/*.tmp-* 2>/dev/null

# Recover worktrees left dirty by an interrupted run (node_modules and the base marker are preserved).
for wt in "$WB" "$WP"; do
  base=$(node -e 'console.log(require(process.argv[1]).base)' "$wt/.rq2-base.json")
  git -C "$wt" reset -q --hard "$base" && git -C "$wt" clean -qfdx -e node_modules -e .rq2-base.json
done
fuser -k 3000/tcp >/dev/null 2>&1 || true

if [ "$#" -gt 0 ]; then IDS=("$@"); else
  mapfile -t IDS < <(node -e '
    const m=require(process.argv[1]); console.log("clean");
    for (const e of m) if (e.unit==="frontend") console.log(e.id);' "$CORPUS/manifest.json")
fi
complete() { # results/frontend/<id>.json exists and has both conditions
  node -e 'try{const r=require(process.argv[1]);process.exit(r.B&&r.P&&typeof r.P.detected==="boolean"?0:1)}catch{process.exit(1)}' "$CORPUS/results/frontend/$1.json"
}
for id in "${IDS[@]}"; do
  if [ "$id" != "clean" ] && [ -z "${RQ2_FORCE:-}" ] && complete "$id"; then echo "[rq2] skip $id (complete)"; continue; fi
  patch_arg=()
  if [ "$id" != "clean" ]; then
    p=$(node -e 'const m=require(process.argv[1]);const e=m.find(x=>x.id===process.argv[2]&&x.unit==="frontend");console.log(e?e.patch:"")' "$CORPUS/manifest.json" "$id")
    [ -z "$p" ] && { echo "[rq2] unknown id $id"; continue; }
    patch_arg=(--patch "$CORPUS/$p")
  fi
  for c in B P; do
    wt=$WB; [ "$c" = P ] && wt=$WP
    [ -f "$OUT/$id-$c.json" ] && [ -z "${RQ2_FORCE:-}" ] && { echo "[rq2] skip $id-$c (exists)"; continue; }
    echo "[rq2] $(date -Iseconds) start $id-$c"
    node "$HERE/rq2-frontend.mjs" run --condition "$c" --worktree "$wt" --id "$id" "${patch_arg[@]}" \
      --out "$OUT/$id-$c.json" --raw "$RAW/$id-$c" || echo "[rq2] ERROR $id-$c"
  done
  # per-defect result + summary rows refreshed after every defect (cheap, idempotent)
  node "$HERE/rq2-frontend-summarize.mjs" "$CORPUS" --append-summary > "$RAW/summarize.log" 2>&1 || echo "[rq2] summarize failed (see $RAW/summarize.log)"
done
echo "[rq2] $(date -Iseconds) done"
