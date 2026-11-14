---
description: Append my status to docs/STATUS.md before pushing or pausing.
argument-hint: [optional note]
---

Append a new entry at the top of the "Log" section (keep it to the 5 lines; if the Log now has more than 10 entries, move the oldest ones to the top of `docs/status-archive.md`) of `docs/STATUS.md` (never edit other people's entries), using this exact format:

```
### <YYYY-MM-DD HH:MM> — <my name> (<zone>)
- Done: <feature IDs + one line>
- In progress: <what, branch name>
- Blocked: <what, waiting on whom, or "nothing">
- Contract changes: <none | what changed in lib/contracts>
- Next: <what I do next>
```

Fill it from: `git log origin/main..HEAD --oneline`, `git status`, the current branch name, and $ARGUMENTS. If I asked another zone for something, also add a line under "Requests". Then commit only `docs/STATUS.md` with message `docs: status handoff (<zone>)`.
