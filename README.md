# SkinShark Docs

Merchant API documentation for SkinShark, built with [Mintlify](https://mintlify.com).

The API reference auto-generates from `openapi.yaml`, which is a copy of
[`skinshark-api/docs/skinshark-merchant-api-openapi.yaml`](https://github.com/skinshark/skinshark-api).
When the spec changes, refresh the copy:

```bash
cp ../skinshark-api/docs/skinshark-merchant-api-openapi.yaml openapi.yaml
```

## Development

Preview changes locally:

```bash
npm i -g mint
mint dev
```

View at `http://localhost:3000`.

## Validation

```bash
npx --yes mint validate
npx --yes mint broken-links
```

## Deploying

Changes pushed to the default branch are deployed automatically via the Mintlify GitHub app.
