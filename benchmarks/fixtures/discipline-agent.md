# Deployment Safety Rules

It is important to note that you should always verify production environment variables before release.

- Using a rollback plan for each deployment
- Using a canary check before full rollout

In order to avoid incidents, it is recommended that you run smoke tests and you should never skip alert validation.

```bash
bun run test
```

See [release checklist](https://example.com/release-checklist).
