/**
 * dsh-opencode-go-usage — browser half.
 *
 * Floating usage widget pinned to the bottom-right corner of the chat UI:
 * three usage windows (5h rolling / weekly / monthly) with progress bars,
 * auto-refresh every 30s, collapse to a small pill, manual refresh, and
 * friendly error states. Data comes from the host route
 * `GET /opencode-go-usage/status` (same origin).
 *
 * The bundle registers under the package name — the compose row's `name` —
 * via `window.__ModuleLoader__`, the lazy-CJS format the client module
 * loader expects. Self-contained: only `react` is required from the client
 * module graph.
 */
window.__ModuleLoader__.load({
  id: 'dsh-opencode-go-usage',
  factory: (require) => {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')

    const NS = 'opencodeGoUsageWidget'
    const REFRESH_MS = 30000
    const STATUS_URL = '/opencode-go-usage/status'
    const LIMITS = { rolling: '$12', weekly: '$30', monthly: '$60' }

    const ZH = {
      title: 'OpenCode Go 用量',
      rolling: '5h 滚动',
      weekly: '每周',
      monthly: '每月',
      limit: '限额',
      resets: '重置',
      loading: '查询中…',
      autoHint: '每 30 秒自动刷新',
      updated: '更新于',
      noKey: '未找到 OPENCODE_GO_API_KEY 或 OpenCode auth.json',
      unauthorized: 'API Key 无效或已过期 (401)',
      network: '网络请求失败',
      httpError: '接口返回 HTTP {status}',
      badJson: '接口响应解析失败',
      retry: '重试',
      collapse: '收起',
      unknown: '未知',
      expandHint: '展开 OpenCode Go 用量',
    }

    const EN = {
      title: 'OpenCode Go usage',
      rolling: '5h rolling',
      weekly: 'Weekly',
      monthly: 'Monthly',
      limit: 'limit',
      resets: 'resets',
      loading: 'Loading…',
      autoHint: 'auto-refresh every 30s',
      updated: 'updated',
      noKey: 'No OPENCODE_GO_API_KEY or OpenCode auth.json found',
      unauthorized: 'API key invalid or expired (401)',
      network: 'Network request failed',
      httpError: 'HTTP {status} from usage endpoint',
      badJson: 'Failed to parse usage response',
      retry: 'Retry',
      collapse: 'Collapse',
      unknown: 'unknown',
      expandHint: 'Expand OpenCode Go usage',
    }

    const CSS = [
      '.ogw-card{position:fixed;right:16px;bottom:16px;width:264px;pointer-events:auto;border:1px solid var(--dsw-alias-border-l2,rgba(15,17,21,.14));border-radius:12px;background:var(--dsw-alias-bg-layer-3,#ffffff);box-shadow:0 12px 32px rgba(15,17,21,.18);color:var(--dsw-alias-label-primary,#0f1115);font-size:12px;overflow:hidden;backdrop-filter:blur(14px)}',
      '.ogw-pill{position:fixed;right:16px;bottom:16px;pointer-events:auto;display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(15,17,21,.14));border-radius:999px;background:var(--dsw-alias-bg-layer-3,#ffffff);box-shadow:0 8px 24px rgba(15,17,21,.16);color:var(--dsw-alias-label-primary,#0f1115);cursor:pointer;user-select:none;backdrop-filter:blur(14px)}',
      '.ogw-head{display:flex;align-items:center;gap:8px;padding:10px 12px 8px}',
      '.ogw-title{font-weight:600}',
      '.ogw-spacer{flex:1}',
      '.ogw-icon{border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#81858c);cursor:pointer;font-size:14px;line-height:1;padding:4px;border-radius:6px}',
      '.ogw-icon:hover{color:var(--dsw-alias-label-primary,#0f1115);background:var(--dsw-alias-bg-layer-1,rgba(15,17,21,.06))}',
      '.ogw-body{display:flex;flex-direction:column;gap:10px;padding:4px 12px 10px}',
      '.ogw-row{display:flex;flex-direction:column;gap:3px}',
      '.ogw-row-head{display:flex;justify-content:space-between;align-items:baseline}',
      '.ogw-name{color:var(--dsw-alias-label-secondary,#61666b)}',
      '.ogw-pct{font-weight:600;font-variant-numeric:tabular-nums}',
      '.ogw-track{height:5px;border-radius:3px;background:var(--dsw-alias-bg-layer-1,rgba(15,17,21,.08));overflow:hidden}',
      '.ogw-fill{height:100%;border-radius:3px;transition:width .3s ease}',
      '.ogw-tone-ok{color:var(--dsw-alias-state-business-primary,#3964fe)}',
      '.ogw-fill.ogw-tone-ok{background:var(--dsw-alias-state-business-primary,#3964fe)}',
      '.ogw-tone-warn{color:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.ogw-fill.ogw-tone-warn{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.ogw-tone-error{color:var(--dsw-alias-state-error-primary,#e5484d)}',
      '.ogw-fill.ogw-tone-error{background:var(--dsw-alias-state-error-primary,#e5484d)}',
      '.ogw-tone-none{color:var(--dsw-alias-label-tertiary,#81858c)}',
      '.ogw-dot{width:8px;height:8px;border-radius:50%;flex:none}',
      '.ogw-dot.ogw-tone-ok{background:var(--dsw-alias-state-success-primary,#2fae60)}',
      '.ogw-dot.ogw-tone-warn{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.ogw-dot.ogw-tone-error{background:var(--dsw-alias-state-error-primary,#e5484d)}',
      '.ogw-dot.ogw-tone-none{background:var(--dsw-alias-label-tertiary,#81858c);opacity:.5}',
      '.ogw-meta{display:flex;justify-content:space-between;color:var(--dsw-alias-label-tertiary,#81858c);font-size:10px}',
      '.ogw-foot{display:flex;justify-content:space-between;padding:7px 12px;border-top:1px solid var(--dsw-alias-border-l2,rgba(15,17,21,.1));color:var(--dsw-alias-label-tertiary,#81858c);font-size:10px}',
      '.ogw-status{padding:8px 12px 12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}',
      '.ogw-error{color:var(--dsw-alias-state-error-primary,#e5484d);font-size:11px;line-height:1.5}',
      '.ogw-btn{border:1px solid var(--dsw-alias-border-l2,rgba(15,17,21,.14));background:transparent;color:var(--dsw-alias-label-primary,#0f1115);font:inherit;font-size:11px;cursor:pointer;border-radius:6px;padding:3px 10px}',
      '.ogw-btn:hover{background:var(--dsw-alias-bg-layer-1,rgba(15,17,21,.06))}',
      '.ogw-spin{animation:ogw-rotate 1s linear infinite}',
      '@keyframes ogw-rotate{to{transform:rotate(360deg)}}',
    ].join('\n')

    function pctOf(w) {
      if (!w || typeof w.percent !== 'number' || !Number.isFinite(w.percent)) return null
      return Math.max(0, Math.min(100, w.percent))
    }

    function toneOf(w) {
      const p = pctOf(w)
      if (p === null) return 'none'
      if (p >= 100) return 'error'
      if (p >= 80) return 'warn'
      return 'ok'
    }

    function fmtTime(iso) {
      if (!iso) return null
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return null
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hh + ':' + mi
    }

    function apply(ctx) {
      let t = (key) => (ZH[key] !== undefined ? ZH[key] : String(key))
      try {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }))
        const translate = ctx.locale.bind(NS)
        t = (key) => {
          const value = translate(key)
          return typeof value === 'string' && value !== key
            ? value
            : (ZH[key] !== undefined ? ZH[key] : String(key))
        }
      } catch (error) {
        console.error('[dsh-opencode-go-usage] locale unavailable:', String((error && error.message) || error))
      }

      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-opencode-go-usage'
      style.textContent = CSS
      document.head.append(style)
      ctx.effect(() => () => style.remove())

      function errorText(error) {
        if (error === 'unauthorized') return t('unauthorized')
        if (error === 'network') return t('network')
        if (error === 'bad-json') return t('badJson')
        if (typeof error === 'string' && error.indexOf('http-') === 0) {
          return t('httpError').replace('{status}', error.slice(5))
        }
        return String(error || t('network'))
      }

      function Row(props) {
        const w = props.win
        const p = pctOf(w)
        const tone = toneOf(w)
        return React.createElement('div', { className: 'ogw-row' },
          React.createElement('div', { className: 'ogw-row-head' },
            React.createElement('span', { className: 'ogw-name' }, props.name),
            React.createElement('span', { className: 'ogw-pct ogw-tone-' + tone }, p === null ? '–' : Math.round(p) + '%')
          ),
          React.createElement('div', { className: 'ogw-track' },
            React.createElement('div', { className: 'ogw-fill ogw-tone-' + tone, style: { width: (p === null ? 0 : p) + '%' } })
          ),
          React.createElement('div', { className: 'ogw-meta' },
            React.createElement('span', null, t('limit') + ' ' + props.limit),
            React.createElement('span', null, t('resets') + ' ' + (fmtTime(w && w.resetsAt) || t('unknown')))
          )
        )
      }

      function Widget() {
        const [collapsed, setCollapsed] = React.useState(false)
        const [state, setState] = React.useState({ kind: 'loading' })
        const inFlight = React.useRef(false)

        const load = React.useCallback(() => {
          if (inFlight.current) return
          inFlight.current = true
          setState((prev) => (prev.kind === 'done' ? { kind: 'done', value: prev.value, refreshing: true } : prev))
          fetch(STATUS_URL, { cache: 'no-store' })
            .then((response) => {
              if (!response.ok) throw new Error('HTTP ' + response.status)
              return response.json()
            })
            .then((result) => {
              inFlight.current = false
              if (!result || result.ok !== true) {
                setState({ kind: 'failure', message: String((result && result.error) || 'remote failed') })
                return
              }
              setState({ kind: 'done', value: result, refreshing: false })
            })
            .catch((error) => {
              inFlight.current = false
              setState({ kind: 'failure', message: String((error && error.message) || error) })
            })
        }, [])

        React.useEffect(() => {
          load()
          const id = window.setInterval(load, REFRESH_MS)
          return () => window.clearInterval(id)
        }, [load])

        if (collapsed) {
          const usage = state.kind === 'done' && state.value ? state.value.usage : null
          const win = usage && usage.rolling
          const p = pctOf(win)
          const tone = toneOf(win)
          const label = state.kind === 'loading'
            ? t('loading')
            : state.kind === 'failure'
              ? '!'
              : (p === null ? 'GO' : 'GO ' + Math.round(p) + '%')
          return React.createElement('div', { className: 'ogw-pill', title: t('expandHint'), onClick: () => setCollapsed(false) },
            React.createElement('span', { className: 'ogw-dot ogw-tone-' + tone }),
            React.createElement('span', null, label)
          )
        }

        let body
        if (state.kind === 'loading') {
          body = React.createElement('div', { className: 'ogw-status' }, t('loading'))
        } else if (state.kind === 'failure') {
          body = React.createElement('div', { className: 'ogw-status' },
            React.createElement('div', { className: 'ogw-error' }, state.message),
            React.createElement('button', { className: 'ogw-btn', onClick: load }, t('retry'))
          )
        } else {
          const value = state.value
          if (value.configured !== true) {
            body = React.createElement('div', { className: 'ogw-status' },
              React.createElement('div', { className: 'ogw-error' }, t('noKey')),
              React.createElement('button', { className: 'ogw-btn', onClick: load }, t('retry'))
            )
          } else if (value.error) {
            body = React.createElement('div', { className: 'ogw-status' },
              React.createElement('div', { className: 'ogw-error' }, errorText(value.error)),
              React.createElement('button', { className: 'ogw-btn', onClick: load }, t('retry'))
            )
          } else {
            const usage = value.usage || {}
            body = React.createElement('div', { className: 'ogw-body' },
              React.createElement(Row, { name: t('rolling'), limit: LIMITS.rolling, win: usage.rolling }),
              React.createElement(Row, { name: t('weekly'), limit: LIMITS.weekly, win: usage.weekly }),
              React.createElement(Row, { name: t('monthly'), limit: LIMITS.monthly, win: usage.monthly })
            )
          }
        }

        const refreshing = state.kind === 'done' && state.refreshing === true
        const dotTone = state.kind === 'failure' ? 'error' : state.kind === 'done' ? 'ok' : 'none'

        return React.createElement('div', { className: 'ogw-card' },
          React.createElement('div', { className: 'ogw-head' },
            React.createElement('span', { className: 'ogw-dot ogw-tone-' + dotTone }),
            React.createElement('span', { className: 'ogw-title' }, t('title')),
            React.createElement('div', { className: 'ogw-spacer' }),
            React.createElement('button', { className: 'ogw-icon' + (refreshing ? ' ogw-spin' : ''), title: t('retry'), onClick: load }, '↻'),
            React.createElement('button', { className: 'ogw-icon', title: t('collapse'), onClick: () => setCollapsed(true) }, '×')
          ),
          body,
          React.createElement('div', { className: 'ogw-foot' },
            React.createElement('span', null,
              t('updated') + ' ' + (state.kind === 'done' && state.value && state.value.fetchedAt ? fmtTime(state.value.fetchedAt) : '–')
            ),
            React.createElement('span', null, t('autoHint'))
          )
        )
      }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'opencode-go-usage', order: 50 },
        () => React.createElement(Widget),
      ))
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale']
    return module.exports
  },
})
