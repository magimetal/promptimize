# API Reference

This reference contains endpoint parameters and example payloads.

## POST /v1/messages

- `channelId` (string, required)
- `body` (string, required)
- `priority` (`low` | `high`, optional)

```json
{
  "channelId": "alerts",
  "body": "Deployment complete"
}
```

Usage details: [send message endpoint](https://example.com/api/messages).
