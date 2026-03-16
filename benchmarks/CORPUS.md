# Benchmark Corpus Registry

| Fixture | Class | Origin slug | Snapshot date | Type |
|---|---|---|---|---|
| `discipline-agent.md` | discipline | synthetic/deployment-safety | n/a | synthetic |
| `discipline-agent-emet.md` | discipline | agents/emet.md | 2026-03-15 | real-derived |
| `discipline-skill-dev-backend-hono.md` | discipline | dev-backend-hono/SKILL.md | 2026-03-15 | real-derived |
| `discipline-skill-dev-frontend.md` | discipline | dev-frontend/SKILL.md | 2026-03-15 | real-derived |
| `discipline-skill-writer-optimize.md` | discipline | writer-optimize/SKILL.md | 2026-03-15 | real-derived |
| `guidance-agent-triage.md` | guidance | synthetic/agent-triage | n/a | synthetic |
| `guidance-skill-maintenance.md` | guidance | synthetic/skill-maintenance | n/a | synthetic |
| `guidance-skill-opencode-commands.md` | guidance | opencode-commands/SKILL.md | 2026-03-15 | real-derived |
| `collaborative-handoff-checklist.md` | collaborative | synthetic/handoff-checklist | n/a | synthetic |
| `collaborative-review-protocol.md` | collaborative | synthetic/review-protocol | n/a | synthetic |
| `reference-api.md` | reference | synthetic/api-reference | n/a | synthetic |
| `reference-skill-opencode-skills.md` | reference | opencode-skills/SKILL.md | 2026-03-15 | real-derived |

Update policy: re-snapshot a real-derived fixture when its source changes substantially, update the `snapshotted:` header date, and keep prior versions in git history.
