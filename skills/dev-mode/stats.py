#!/usr/bin/env python3
"""Token and time stats for one span of a Claude Code session, from its transcript.

Used by dev-mode to put a Cost section in every feedback report, so a run that burns
tokens or stalls can be seen and explained.

  python3 stats.py --skill dev-build                 # from the last /dev-build (or Agent for it) to the next /dev-mode
  python3 stats.py --skill dev-build --nth 1         # from the first /dev-build in the session instead of the last
  python3 stats.py --since 'regex' --until 'regex'   # any span, matched against the raw transcript lines
  python3 stats.py                                   # the whole session so far
  python3 stats.py --transcript path.jsonl ...       # a transcript other than this session's

The transcript is ~/.claude/projects/<cwd with every non-alphanumeric character replaced by ->/<session>.jsonl;
the newest one for the current folder is used unless --transcript is given. Prints Markdown for the report.
"""
import argparse
import datetime as dt
import json
import os
import pathlib
import re
import sys

ACTIVE_GAP_S = 120  # a gap longer than this between two calls is taken as waiting on the user
# "New input" is input_tokens plus cache_creation_input_tokens: with prompt caching on, almost all
# fresh context is billed as a cache write, so input_tokens alone would hide it.


def find_transcript():
    enc = re.sub(r"[^A-Za-z0-9]", "-", os.getcwd())
    folder = pathlib.Path.home() / ".claude" / "projects" / enc
    files = sorted(folder.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        sys.exit(f"stats: no transcript under {folder}; pass --transcript")
    return files[0]


def parse_ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def fmt_n(n):
    if n >= 1_000_000:
        return f"{n / 1e6:.1f}M"
    return f"{n:,}"


def local(ts):
    return ts.astimezone().strftime("%d %b %H:%M")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript")
    ap.add_argument("--skill", help="component name; builds the --since regex for its invocation")
    ap.add_argument("--since", help="regex; the span starts at the LAST line matching it")
    ap.add_argument("--nth", type=int, default=-1,
                    help="which --since match starts the span: 1 is the first in the session, -1 (default) the last")
    ap.add_argument("--until", help="regex; the span ends before the first later line matching it",
                    default=r'<command-name>/dev-mode|"skill":\s*"dev-mode"')
    args = ap.parse_args()

    path = pathlib.Path(args.transcript) if args.transcript else find_transcript()
    since = args.since
    if args.skill and not since:
        n = re.escape(args.skill)
        # A skill can be invoked under its plugin namespace, /my-dev-skills:dev-build, so allow a prefix.
        since = rf'<command-name>/(?:[\w-]+:)?{n}\b|"skill":\s*"(?:[\w-]+:)?{n}"|"subagent_type":\s*"[^"]*{n}"'
    since_re = re.compile(since) if since else None
    until_re = re.compile(args.until) if args.until else None

    lines = path.read_text(errors="replace").splitlines()

    # A boundary is an invocation, never an echo: the regex is matched only against tool-use
    # blocks (Skill name, Agent description and subagent_type, a Bash command) and typed
    # /commands, so tool results and earlier output of this script cannot start or end a span.
    # Commands that run this script are skipped too.
    def boundary_text(line):
        try:
            r = json.loads(line)
        except Exception:
            return ""
        m = r.get("message") or {}
        if r.get("type") == "assistant":
            blocks = [json.dumps(c.get("input") or {}) for c in (m.get("content") or [])
                      if isinstance(c, dict) and c.get("type") == "tool_use"]
            text = " ".join(blocks)
            return "" if "stats.py" in text else text
        if r.get("type") == "user":
            content = m.get("content")
            text = content if isinstance(content, str) else " ".join(
                c.get("text", "") for c in (content or []) if isinstance(c, dict) and c.get("type") == "text")
            return text if "<command-name>" in text else ""
        return ""

    bounds = [boundary_text(l) for l in lines]
    start = 0
    if since_re:
        hits = [i for i, t in enumerate(bounds) if t and since_re.search(t)]
        if not hits:
            sys.exit(f"stats: nothing in {path.name} matches --since")
        if args.nth == 0 or abs(args.nth) > len(hits):
            sys.exit(f"stats: --nth {args.nth} is out of range; {len(hits)} match(es) of --since")
        start = hits[args.nth - 1] if args.nth > 0 else hits[args.nth]
    end = len(lines)
    if until_re:
        for i in range(start + 1, len(lines)):
            if bounds[i] and until_re.search(bounds[i]):
                end = i
                break

    calls, out_t, in_t, cr_t, cw_t = 0, 0, 0, 0, 0  # cw_t kept for the heaviest-call detail
    stamps, heavy, prev_ts, prev_tools, gaps = [], [], None, "start", []
    subagents = []
    seen_tasks = set()
    # One API response is stored as several assistant records, one per content block, all with the
    # same message id and usage. Count usage once per id and merge the tool names.
    seen = {}
    for line in lines[start:end]:
        m = re.search(r'<subagent_tokens>(\d+)</subagent_tokens>', line)
        tid = re.search(r'<task-id>([^<]+)</task-id>', line)
        if m and (not tid or tid.group(1) not in seen_tasks):
            if tid:
                seen_tasks.add(tid.group(1))
            d = re.search(r'<duration_ms>(\d+)</duration_ms>', line)
            name = re.search(r'Agent \\?"(.+?)\\?" finished', line)
            subagents.append((name.group(1) if name else "agent", int(m.group(1)), int(d.group(1)) / 60000 if d else 0.0))
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get("type") != "assistant":
            continue
        u = (r.get("message") or {}).get("usage") or {}
        if not u or not r.get("timestamp"):
            continue
        ts = parse_ts(r["timestamp"])
        tools = [c.get("name") for c in (r["message"].get("content") or []) if isinstance(c, dict) and c.get("type") == "tool_use"]
        label = ",".join(t for t in tools if t) or "text"
        mid = r["message"].get("id") or r.get("uuid")
        if mid in seen:
            idx = seen[mid]
            if label != "text" and heavy[idx][2] == "text":
                heavy[idx] = (heavy[idx][0], heavy[idx][1], label)
                prev_tools = label
            continue
        seen[mid] = len(heavy)
        new_in = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        calls += 1
        out_t += u.get("output_tokens", 0)
        in_t += new_in
        cr_t += u.get("cache_read_input_tokens", 0)
        cw_t += u.get("cache_creation_input_tokens", 0)
        heavy.append((new_in, ts, label))

    if not calls:
        sys.exit("stats: no model calls in that span")
    ordered = sorted(heavy, key=lambda h: h[1])
    stamps = [h[1] for h in ordered]
    for (_, a, label_a), (_, b, _) in zip(ordered, ordered[1:]):
        gaps.append(((b - a).total_seconds(), a, label_a))
    wall = (stamps[-1] - stamps[0]).total_seconds() / 60
    active = sum(g for g, _, _ in gaps if g <= ACTIVE_GAP_S) / 60

    print("## Cost")
    print()
    print(f"Span: {local(stamps[0])} to {local(stamps[-1])}, transcript `{path.name}`"
          + (f", from match {args.nth} of `{since}`" if since else ", whole session"))
    print()
    print("| Calls | Output tokens | New input tokens | Cache-read tokens | Wall min | Active min |")
    print("|---|---|---|---|---|---|")
    print(f"| {calls} | {fmt_n(out_t)} | {fmt_n(in_t)} | {fmt_n(cr_t)} | {wall:.1f} | {active:.1f} |")
    print()
    if subagents:
        tot_t = sum(t for _, t, _ in subagents)
        tot_m = sum(m for _, _, m in subagents)
        print(f"Subagents, counted separately: {len(subagents)} runs, {fmt_n(tot_t)} tokens, {tot_m:.1f} min")
        for name, t, m in subagents:
            print(f"- {name}: {fmt_n(t)} tokens, {m:.1f} min")
        print()
    long_gaps = sorted((g for g in gaps if g[0] > ACTIVE_GAP_S), reverse=True)[:3]
    if long_gaps:
        print("Longest gaps (likely waiting on the user or an agent):")
        for g, at, after in long_gaps:
            print(f"- {g / 60:.1f} min after {after} at {local(at)}")
        print()
    print("Heaviest calls by new input:")
    for n, ts, label in sorted(heavy, reverse=True)[:3]:
        print(f"- {fmt_n(n)} tokens at {local(ts)}, {label}")


if __name__ == "__main__":
    main()
