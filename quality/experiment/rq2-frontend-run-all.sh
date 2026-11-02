#!/usr/bin/env bash
# Runs RQ2 (frontend) for clean + every frontend defect of the corpus manifest, B then P, sequentially
# (sequential on purpose: durations are an outcome of the experiment).
#
#   rq2-frontend-run-all.sh <corpus dir> <worktree B> <worktree P> <raw dir> [id ...]
#
# Without ids: clean, then every manifest entry with unit == "frontend" (in manifest order).
# Results: <corpus dir>/results/frontend/runs/<id>-<B|P>.json ; logs/raw evidence in <raw dir>.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CORPUS="$1"; WB="$2"; WP="$3"; RAW="$4"; shift 4
OUT="$CORPUS/results/frontend/runs"
mkdir -p "$OUT" "$RAW"
if [ "$#" -gt 0 ]; then IDS=("$@"); else
  mapfile -t IDS < <(node -e '
    const m=require(process.argv[1]); console.log("clean");
    for (const e of m) if (e.unit==="frontend") console.log(e.id);' "$CORPUS/manifest.json")
fi
for id in "${IDS[@]}"; do
  patch_arg=()
  if [ "$id" != "clean" ]; then
    p=$(node -e 'const m=require(process.argv[1]);const e=m.find(x=>x.id===process.argv[2]&&x.unit==="frontend");console.log(e?e.patch:"")' "$CORPUS/manifest.json" "$id")
    [ -z "$p" ] && { echo "[rq2] unknown id $id"; continue; }
    patch_arg=(--patch "$CORPUS/$p")
  fi
  for c in B P; do
    wt=$WB; [ "$c" = P ] && wt=$WP
    [ -f "$OUT/$id-$c.json" ] && [ -z "${RQ2_FORCE:-}" ] && { echo "[rq2] skip $id-$c (exists)"; continue; }
    node "$HERE/rq2-frontend.mjs" run --condition "$c" --worktree "$wt" --id "$id" "${patch_arg[@]}" \
      --out "$OUT/$id-$c.json" --raw "$RAW/$id-$c" || echo "[rq2] ERROR $id-$c"
  done
done
echo "[rq2] done"
