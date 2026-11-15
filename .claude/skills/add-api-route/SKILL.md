---
name: add-api-route
description: Add or change a memorAI API route the contract-first way (Zod contract, route handler, mock, test). Use whenever creating or modifying anything under app/api/.
---

Follow `docs/playbooks/add-api-route.md` exactly. It is the single source shared with Codex; read it now before writing code.

Summary: contract in `lib/contracts/` first (own PR if it changes an existing shape) → route handler validating with the contract and returning `{ data }` / `{ error }` → mock data if the route depends on AI → Vitest test → entry in `TECHNICAL.md` §4.3 if the route is new.
