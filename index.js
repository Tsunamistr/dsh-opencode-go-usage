/**
 * dsh-opencode-go-usage — Host half.
 *
 * Redevelopment of xiaoqi20/dsh-opencode-go-usage: instead of a settings page
 * with a manual refresh button, the host serves `GET /opencode-go-usage/status`
 * (OpenCode Go subscription usage: 5h rolling / weekly / monthly) and the
 * browser widget polls it every 30 seconds.
 *
 * Deliberately ZERO external imports — node builtins + cordis services only —
 * so the package loads from any linked location without peer-resolution issues.
 * API keys are never returned by the route.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

export const name = 'opencode-go-usage'
export const inject = ['webServer', 'credentials']

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go/v1/usage'
const DEFAULT_TIMEOUT_MS = 15000
const ROUTE_PATH = '/opencode-go-usage/status'
const CACHE_MS = 5000

export function apply(ctx, config) {
  const baseUrl =
    config && typeof config.baseUrl === 'string' && config.baseUrl.length > 0
      ? config.baseUrl
      : DEFAULT_BASE_URL
  const timeoutMs =
    config && typeof config.timeoutMs === 'number' && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_TIMEOUT_MS

  let cache = { at: 0, payload: null }

  function pickWindow(w) {
    if (!w || typeof w !== 'object') return null
    const percent = typeof w.percent === 'number' ? w.percent : Number(w.percent)
    return {
      status: typeof w.status === 'string' ? w.status : null,
      percent: Number.isFinite(percent) ? percent : null,
      resetsAt: typeof w.resetsAt === 'string' ? w.resetsAt : null,
    }
  }

  function result(partial) {
    return Object.assign(
      {
        ok: true,
        configured: true,
        reason: null,
        error: null,
        detail: null,
        usage: null,
        fetchedAt: null,
      },
      partial,
    )
  }

  /**
   * Resolve the OpenCode Go API key, most-trusted first:
   *   1. DSH credentials seam `OPENCODE_GO_API_KEY`
   *      (covers ~/.dsh/.credentials.yaml and the process environment)
   *   2. OpenCode's own auth.json: opencode-go (fallback opencode) type=api key
   */
  async function resolveApiKey() {
    try {
      const cred = await ctx.credentials.resolve('OPENCODE_GO_API_KEY')
      if (cred && typeof cred.value === 'string' && cred.value.length > 0) return cred.value
    } catch {
      /* fall through */
    }
    try {
      const raw = await readFile(join(homedir(), '.local', 'share', 'opencode', 'auth.json'), 'utf8')
      const data = JSON.parse(raw)
      const entry = data['opencode-go'] !== undefined ? data['opencode-go'] : data['opencode']
      if (entry && entry.type === 'api' && typeof entry.key === 'string' && entry.key.length > 0) {
        return entry.key
      }
    } catch {
      /* fall through */
    }
    return undefined
  }

  async function fetchUsage(apiKey) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(baseUrl, {
        headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
        signal: controller.signal,
      })
      if (res.status === 401) return result({ error: 'unauthorized' })
      if (!res.ok) return result({ error: 'http-' + res.status })
      let body
      try {
        body = await res.json()
      } catch {
        return result({ error: 'bad-json' })
      }
      const usage = body && typeof body === 'object' && body.usage ? body.usage : body
      return result({
        usage: {
          rolling: pickWindow(usage && usage.rolling),
          weekly: pickWindow(usage && usage.weekly),
          monthly: pickWindow(usage && usage.monthly),
        },
        fetchedAt: new Date().toISOString(),
      })
    } catch (error) {
      return result({ error: 'network', detail: String((error && error.message) || error).slice(0, 200) })
    } finally {
      clearTimeout(timer)
    }
  }

  /** Short in-memory cache: absorbs widget poll bursts without hitting the API. */
  async function statusPayload() {
    const now = Date.now()
    if (cache.payload !== null && now - cache.at < CACHE_MS) return cache.payload
    const apiKey = await resolveApiKey()
    const payload = apiKey ? await fetchUsage(apiKey) : result({ configured: false, reason: 'no-api-key' })
    cache = { at: now, payload }
    return payload
  }

  ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end('{"error":"method not allowed"}')
        return
      }
      const payload = await statusPayload()
      const body = JSON.stringify(payload)
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(req.method === 'HEAD' ? undefined : body)
    },
  })
}
