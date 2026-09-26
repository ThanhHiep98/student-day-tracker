# /dev-flow — Plan → Implement → Test

Runs the Student Day Tracker feature workflow end to end for one slice of work:

```
planner  →  implementer  →  tester  →  (NEEDS WORK: back to planner or implementer; SHIP: done)
```

## Usage

```
/dev-flow [task description]
```

- With a task description: plan exactly that slice (e.g. `/dev-flow Add Activity form on Home`).
- With no argument: `planner` picks the next slice from `docs/REQUIREMENTS.md`'s "Out of scope"
  list, in the order listed there.

## Execution

1. **Invoke `planner`** with the task description (or none). It reads
   `requirement/Requirement.docx` + the codebase and writes `plans/<date>-<slug>.html`, and may
   append to `CLAUDE.md`'s Coding Rules. Its final message ends with a `HANDOFF: planner ->
   implementer` block naming the plan file.
2. **Invoke `implementer`**, passing it the plan file path from the handoff. It implements the
   slice test-first and ends with `HANDOFF: implementer -> tester` naming files changed.
3. **Invoke `tester`**, passing it the plan file path. It runs the full check suite and grades the
   plan's success criteria, ending with a `TEST REPORT` and a `SHIP` / `NEEDS WORK` verdict.
4. **On `NEEDS WORK`**: read the report's Recommendation. If it says "send back to planner", loop
   to step 1 with that note as context. Otherwise loop to step 2 (`implementer`) with the report.
   Cap at 2 retry loops — if still failing after that, stop and hand the full report to the user
   instead of continuing to loop.
5. **On `SHIP`**: stop. Summarize what shipped (one paragraph) and point at the plan file and the
   files changed.

## Final report to the user

```
DEV-FLOW REPORT
================
Slice: <one line>
Plan: plans/<file>.html
Verdict: SHIP | STOPPED (needs human input)

Files changed
-------------
<list>

Test results
------------
<summary from tester's TEST REPORT>

Next slice suggestion (if SHIP)
--------------------------------
<from docs/REQUIREMENTS.md's ordered "Out of scope" list>
```
