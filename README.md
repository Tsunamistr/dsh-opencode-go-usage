# dsh-opencode-go-usage

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web-GUI plugin that adds an **OpenCode Go** entry to the Settings sidebar. Click it to see your OpenCode Go subscription's three usage windows — **5-hour rolling / weekly / monthly** — with percent used, spend limit, and reset time.

## Features

- Settings sidebar section **"OpenCode Go"** (a `settings.section` contribution)
- Host-side Typert Remote `opencodeUsage/usage` reads the API key and calls the official endpoint
- Client usage page: per-window percent, progress bar, limit, and reset time
- Precondition check: if opencode-go is missing from **Settings → Models**, or no API key is found, it shows guidance instead of an error
- API key resolved from the DSH credentials seam (`OPENCODE_GO_API_KEY`) with a fallback to OpenCode's `auth.json`

## Install

```sh
dsh plugin --profile web add github:xiaoqi20/dsh-opencode-go-usage
```

Add the plugin row to your profile's patch layer (`$DSH_HOME/profiles/web/cordis.patch.yml`):

```yaml
- insert:
    - id: opencode-go-usage
      name: 'dsh-opencode-go-usage'
```

Restart `dsh web` so the host half and the served client bundle pick up the plugin. The plugin needs the standard web bundle composition (the `api-gateway` client Remote and the `settings.section` slot) — the default `dsh web` profile has both.

## Configuration

Host-side tunables live on the plugin row in `cordis.yml`:

```yaml
- id: opencode-go-usage
  name: dsh-opencode-go-usage
  config:
    baseUrl: https://opencode.ai/zen/go/v1/usage   # default
    timeoutMs: 15000                                # default
```

| Key | Default | Meaning |
| --- | --- | --- |
| `baseUrl` | `https://opencode.ai/zen/go/v1/usage` | The usage endpoint. |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds. |

## The usage endpoint

```http
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <API_KEY>
```

`<API_KEY>` is the Anthropic-compatible OpenCode Go key (`sk-opencode-…`). The endpoint returns:

```json
{
  "usage": {
    "rolling": { "status": "ok", "percent": 9,  "resetsAt": "2026-08-14T07:20:04.810Z" },
    "weekly":  { "status": "ok", "percent": 12, "resetsAt": "2026-08-17T00:00:00.810Z" },
    "monthly": { "status": "ok", "percent": 6,  "resetsAt": "2026-09-09T00:41:03.810Z" }
  }
}
```

`percent` is 0–100; `resetsAt` is ISO-8601. The endpoint is not yet in OpenCode's public docs.

## API key resolution order

1. DSH credentials seam / environment `OPENCODE_GO_API_KEY` (`$DSH_HOME/.credentials.yaml`)
2. OpenCode `~/.local/share/opencode/auth.json` → the `opencode-go` entry (fallback `opencode`) with `type: "api"`

## How it works

A dual-face (Host + Client) plugin. The Host publishes the `opencodeUsage` Typert Remote service; the Client mounts it, registers the `settings.section`, and renders the page. Communication rides the harness `/api` RPC carrier.

| File | Role |
| --- | --- |
| `index.js` | Host half — `OpencodeUsageGateway` (`TypertRemoteService`, service key `opencodeUsage`) |
| `typert.host.js` | Hand-written Typert host manifest, registered via `exports["./typert"]` |
| `client.js` | Browser bundle in `window.__ModuleLoader__.load` format — mounts the Remote, registers the section, renders the page |
| `package.json` | Dual-face declaration: `main` + `exports["./client"]` + `exports["./typert"]` + `dsh.client` |

## Development

The plugin is plain ESM and needs no build step. Host files import `@deepseek-ai/*` peers; the client bundle is hand-written in the lazy-CJS format the harness client loader serves under `/plugins`.

## Known limitations

- The usage endpoint is undocumented and may change; parsing is defensive, and non-200 responses surface as a friendly status rather than a crash.
- Quota limits ($12 / $30 / $60) are shown for context only and are not part of the response; they follow the OpenCode Go plan and can drift.

## License

MIT

