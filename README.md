# `@sinequa/agent` web components

Angular Elements build that publishes the `@sinequa/agent` library as browser
**custom elements**, so the new agent UI can be embedded in non-Angular hosts (a CMS, a React
app, a plain HTML page). It is the agent-library counterpart of the `web-component-assistant` project,
which does the same for the legacy `@sinequa/assistant` library.

## Elements

| Element | Wraps | Key properties | Notes |
| --- | --- | --- | --- |
| `<sq-agent>` | `AgentInjector` | `instanceId` (required), `chatId`, `enabled` | The main, self-contained chat (input, messages, tool cards, toolbars). |
| `<sq-saved-chats>` | `SavedChatComponent` | `instanceId`, `activeChatId`, `searchText`, `readonly` | Saved-conversations list. Emits `sq-chat-selected`. |
| `<sq-saved-chats-dialog>` | `SavedChatsDialogComponent` | `instanceId`, `open` | Searchable modal. Set `open = true` to show; the element resets `open` to `false` on every close (Escape, outside click, close button, chat selection) and emits `sq-dialog-closed`. |
| `<sq-settings>` | `SettingsComponent` | `debug` | User button opening a menu with the impersonation entry (shown when the principal may impersonate) and the settings panel itself: appearance / language / debug / logout. Instance-agnostic. The logout entry dispatches `agent-logout` (see Events). |

All properties are set imperatively on the DOM element (e.g. `el.instanceId = 'chatSearchInstance'`),
which is how Angular Elements maps component inputs. Boolean inputs (`enabled`, `readonly`, `open`,
`debug`) also work as HTML attributes with the native convention: presence means `true`
(`<sq-saved-chats readonly>`), the string `"false"` means `false`.

## Run the application (local dev)

Follow these steps in order.

### 1. Configure `src/index.html`

Open [`src/index.html`](src/index.html) and set the demo constants in the `<script type="module">` block:

| Constant | Purpose |
| --- | --- |
| `APP_NAME` | The Sinequa application name (must match the backend app). |
| `INSTANCE_ID` | The agent instance id (a key in the app-customization "agents" JSON). |
| `BACKEND_URL` | The Sinequa backend URL used by the elements bundle (e.g. `http://localhost:88`). Omit/leave empty for same-origin setups that rely only on the dev-server proxy. |
| `STATIC_BEARER_TOKEN` | A bearer token for local dev (exchanged for a CSRF web token). Leave empty to use the interactive `login()` / OAuth flow instead. |

```js
const APP_NAME = 'agent';
const INSTANCE_ID = 'chatSearchInstance';
const BACKEND_URL = 'http://localhost:88';
const STATIC_BEARER_TOKEN = '<your-bearer-token>';
```

#### Bearer token permissions

The Sinequa access token must grant access to the endpoints below (set on the token's
**"Allowed JSON methods"**). If any is missing, the demo fails at bootstrap or at runtime:

```
security.webtoken
security.principal
dev.plugin
audit.notify
search.query
search.app
search.usersettings
/api/v2/app/{appName}/query/{queryName}
/api/v2/agent/saved-chats/{id},/api/v2/agent/saved-chats
```

### 2. Configure `vite/vite.config.ts`

Set **`API_URL`** to your Sinequa backend. It is the proxy target for `/api`, `/endpoints`
(SignalR websocket), `/xdownload`, and `/auth/redirect`:

```ts
const API_URL = 'http://localhost:88';
```

### 3. Build the elements bundle (root folder)

```bash
npm install        # if peer-dependency resolution fails: npm install --legacy-peer-deps
npm run build
```

`build` runs `ng build` (production configuration by default), preceded by the `prebuild`
Transloco extraction and followed by the `postbuild` copy of `atomic.js`. The `postbuild` script
uses the Windows `copy` command, so on macOS/Linux replace it with `cp` (or run `ng build`
directly and copy the file yourself).

### 4. Serve the demo (`vite` folder)

```bash
cd vite
npm install        # one-time: install the Vite harness deps
npm run vite
```

Vite serves the built `dist/agent-element/browser/` folder over HTTPS on `https://localhost:4200`
(self-signed certificate via `@vitejs/plugin-basic-ssl`, so accept the browser warning on first
visit), proxying `/api`, `/endpoints` (SignalR websocket), `/xdownload`, and `/auth/redirect` to
`API_URL`. Vite serves the build output, not `src/`: after changing `src/index.html`, re-run
`npm run build` in the root folder.

> Shortcut: from the root folder, `npm start` runs `npm run build` and then the Vite harness in one
> command — but `npm install` inside `vite/` must have been run at least once beforehand.

## Build output

`npm run build` writes to `dist/agent-element/browser/`. The relevant artifacts for a host page are:

- `main.js`: the entry point; registers the bootstrap global and, once bootstrapped, the custom
  elements (loaded as an ES module)
- `chunk-*.js`: lazily loaded code-split chunks pulled in by `main.js` — keep the whole folder
  together when deploying
- `styles.css`: the compiled Tailwind + theme stylesheet (required for correct rendering)
- `media/`: fonts and images referenced from the stylesheets
- `assets/`: fonts, logos, and the Transloco translation files (`assets/i18n/…`)
- `atomic.js`: the `@sinequa/atomic` runtime SDK, copied by the `postbuild` step. Optional: the
  demo host does not use it (config/auth go through the bootstrap options); it is available for
  hosts that want to drive atomic directly (note: separate instance from the elements bundle)
- `index.html`: the built demo host page (from `src/index.html`) — this is what Vite serves

The build has no polyfills (`polyfills: []` in [`angular.json`](angular.json)), so no
`polyfills.js` is emitted. `outputHashing` is disabled in the production configuration, so
`main.js` and `styles.css` keep stable names a host page can reference directly (the code-split
`chunk-*.js` files are still content-named and referenced by `main.js`).

## Host integration

The agent library reads its runtime config from `@sinequa/atomic`'s global config, and its
per-instance configuration from the Sinequa server's app-customization JSON.

**Important: one atomic instance.** The elements bundle (`main.js`) contains its own bundled copy
of `@sinequa/atomic`. It is a *different* module instance from the standalone `atomic.js`, with
independent global-config and token state. So the host must **not** call `setGlobalConfig` / `login`
on `atomic.js` and expect the elements to see it. Instead, the host passes its config to the
bootstrap, and the bundle configures + authenticates on its own instance.

`main.ts` does not auto-bootstrap; it exposes `window.__bootstrapSinequaAgentElements(options)` and
dispatches a `sq-agent-elements-loaded` event once ready. The bootstrap performs, in order:
`setGlobalConfig` → `createApplication` (which runs the atomic app initializers: pre-login config,
`withBootstrapApp` for the app-customization JSON, and the theme initializer) → `login()`
(bearer-token or interactive flow, per the global config set in step 1) → `customElements.define`
for the four elements.

The bootstrap is **memoized**: the first call wins and every later call returns the same promise
(its options are ignored), so re-entrant hosts cannot re-authenticate or create a second Angular
application. A **rejected** bootstrap clears the memo, so the host can retry after, e.g., a bad
token. Loading two copies of the bundle on one page fails fast with a descriptive error.

`bootstrapAgentElements(options)` options:

| Option | Required | Purpose |
| --- | --- | --- |
| `app` | yes | Sinequa application name (must match the backend app). |
| `token` | no | Static bearer token for local dev; exchanged for a CSRF web token. |
| `backendUrl` | no | Backend URL. Omit for same-origin (dev-server proxy) setups. |
| `oauthProvider` / `samlProvider` | no | Provider for the interactive `login()` flow (used when no `token`). |
| `useCredentials` | no | Send credentials with requests. |

Minimal host flow (see [`src/index.html`](src/index.html) for a complete example):

```html
<script type="module">
  // Wait for main.js to register the bootstrap, then run it.
  if (!window.__bootstrapSinequaAgentElements) {
    await new Promise(r => document.addEventListener('sq-agent-elements-loaded', r, { once: true }));
  }
  await window.__bootstrapSinequaAgentElements({ app: 'agent', token: '<bearer-token>' });

  const agent = document.createElement('sq-agent');
  agent.instanceId = 'chatSearchInstance';
  document.body.appendChild(agent);
</script>
```

`app` and `instanceId` must match the backend app and an entry in its app-customization "agents"
JSON, respectively. The host does not need to import `atomic.js` (the copied SDK bundle remains
available for hosts that want to drive atomic directly, but it is a separate instance from the
elements).

### Events

The Agent communicates with the host via bubbling DOM `CustomEvent`s (there are no Angular
`@Output`s). The demo host page listens for these to re-implement the toast UX that the
Angular demo gets from host directives:

| Event | Direction | Detail |
| --- | --- | --- |
| `agent-new-chat` | host → agent | `{ instanceId }`: resets the conversation. Dispatch on `document`. |
| `agent-retry-connection` | host → agent | `{ instanceId }`: soft reconnect. |
| `sq-chat-selected` | `<sq-saved-chats>` → host | the selected `SavedChat`. Typically sets `chatId` on `<sq-agent>`. |
| `sq-dialog-closed` | `<sq-saved-chats-dialog>` → host | no detail. Fired on every close; the element has already reset its own `open` property. |
| `agent-logout` | `<sq-settings>` → host | no detail (the settings surface is instance-agnostic). `main.ts` listens for it and calls atomic's `logout()` on the bundle's own instance — clearing the stored tokens and asking the server to end the session; the returned redirect URL is ignored. The host owns the post-logout UX (redirect, messaging). |
| `agent-user-override` | agent → host | `{ instanceId, outcome, username?, domain? }`: impersonation applied / reverted (or failed), triggered from the `<sq-settings>` impersonation entry. |
| `agent-connection-lost` / `agent-reconnecting` / `agent-reconnected` | agent → host | `{ instanceId, … }` connection lifecycle. |
| `agent-error` | agent → host | `{ id, error?, errorMessage? }`. |
| `agent-saved-chat` | agent / `<sq-saved-chats>` → host | `{ id, instanceId, chatId?, error?, errorMessage? }`. |
| `sq-agent-elements-loaded` | bundle → host | no detail. Fired once at script load, when the bootstrap global is available. |
| `sinequa-set-language` | host → elements | `{ lang }`: switches the UI language at runtime. |
| `sinequa-language-changed` | elements → host | `{ lang }`: confirmation, fired on `document` after the active language actually changed (via the event above or the `<sq-settings>` language dialog). |

## Translations

Translation files ship as build assets under `assets/i18n/`. The base language files
(`en/fr/de/ja.json`) are committed and hold the demo host page's own labels; the scoped
translations from `@sinequa/agent` and `@sinequa/atomic-angular` are extracted by the
`prebuild` / `prewatch` steps (`transloco-scoped-libs`, configured in
[`transloco.config.ts`](transloco.config.ts)) and are git-ignored.

## Notes

- **Zoneless.** The build has no `zone.js` polyfill and uses `provideZonelessChangeDetection()`, matching
  the library's signal-based design. If custom elements fail to re-render, add `zone.js` to
  `polyfills` in `angular.json` and drop `provideZonelessChangeDetection()` from `src/main.ts`.
- **Light DOM.** The elements render in the light DOM (no Shadow DOM); the emitted `styles.css`
  provides the Tailwind utilities and theme variables the library templates rely on.
