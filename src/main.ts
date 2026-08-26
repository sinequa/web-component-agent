import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer, provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { AGENT_INSTANCE_ID, AGENT_LOGOUT_EVENT_NAME, LoggerService, provideDefaultAffordance, provideDefaultAgentJsonName, provideDefaultAgentToolbarActions, provideDefaultDebugPresentation, provideDefaultEmptyComponent, provideDefaultErrorComponent, provideDefaultImpersonationComponent, provideDefaultInputFilters, provideDefaultRendererPlugins, provideDefaultShikiHighlighterConfig, provideDefaultToolCardPlugins, provideDefaultUserToolbarActions, provideDefaultWelcomeComponent, RendererService, SavedChatsService, themeInitializerFn } from '@sinequa/agent';
import { appInitializerFn, login, logout, setGlobalConfig } from '@sinequa/atomic';
import { ApplicationService, authInterceptorFn, withBootstrapApp } from '@sinequa/atomic-angular';

import { AgentElementWrapper } from './wrapper/agent-wrapper';
import { SavedChatsElementWrapper } from './wrapper/saved-chats-wrapper';
import { SavedChatsDialogElementWrapper } from './wrapper/saved-chats-dialog-wrapper';
import { SettingsElementWrapper } from './wrapper/settings-wrapper';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideRouter } from '@angular/router';

/**
 * Options for {@link bootstrapAgentElements}.
 *
 * CRITICAL: global config and authentication MUST happen on the atomic instance bundled INTO
 * this build, not on the standalone `atomic.js` a host page might import. Those are two
 * separate module instances with independent `globalConfig`/token state, so config set on one
 * is invisible to the other. That is why the host passes these options in and the bundle calls
 * `setGlobalConfig` / `login` / `setToken` itself.
 */
export interface AgentElementsBootstrapOptions {
  /** Sinequa application name (must match the backend app). Required. */
  app: string;
  /** Backend URL. Omit for same-origin (dev-server proxy) setups. */
  backendUrl?: string;
  /** Static bearer token for local dev. When set, it is exchanged for a CSRF web token. */
  token?: string;
  /** OAuth provider name for the interactive `login()` flow (when no `token`). */
  oauthProvider?: string;
  /** SAML provider name for the interactive `login()` flow (when no `token`). */
  samlProvider?: string;
  /** Whether to send credentials with requests. */
  useCredentials?: boolean;
}

/**
 * Configures atomic, authenticates, then bootstraps the Angular application context and
 * registers the agent custom elements.
 *
 * Steps (order matters): `setGlobalConfig` → authenticate → `createApplication`. The atomic app
 * initializers in the provider list (`appInitializerFn`, `withBootstrapApp`) read the now-set
 * global config + token and load the per-instance agent configuration from the server. If they
 * ran before config/auth, the agent machine would land in `ConfigurationIsInvalid`.
 */
async function bootstrapAgentElements(options: AgentElementsBootstrapOptions): Promise<void> {
  if (!options?.app) throw new Error('bootstrapAgentElements: `app` option is required');

  // Module-scope memoization cannot see a SECOND copy of the bundle loaded on the same page:
  // fail loudly before any side effect instead of creating an orphan application and then
  // throwing NotSupportedError halfway through.
  if (customElements.get('sq-agent')) {
    throw new Error('bootstrapAgentElements: the agent elements are already defined (is the bundle loaded twice?)');
  }

  setGlobalConfig({
    app: options.app,
    ...(options.backendUrl !== undefined ? { backendUrl: options.backendUrl } : {}),
    ...(options.token ? { bearerToken: options.token } : {}),
    ...(options.oauthProvider ? { autoOAuthProvider: options.oauthProvider } : {}),
    ...(options.samlProvider ? { autoSAMLProvider: options.samlProvider } : {}),
    ...(options.useCredentials !== undefined ? { useCredentials: options.useCredentials } : {})
  });

  const app = await createApplication({
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptorFn])),

      // TanStack Query client is required by the search tools.
      provideTanStackQuery(new QueryClient()),

      // Atomic bootstrap: loads global config + the app-customization JSON (per-instance agent
      // configuration) into the stores. Runs after the host has logged in (see above).
      provideAppInitializer(appInitializerFn),
      provideAppInitializer(() => withBootstrapApp(inject(ApplicationService), { createRoutes: false })),
      provideAppInitializer(themeInitializerFn),

      provideEnvironmentInitializer(() => inject(RendererService)),

      // Root fallback for AGENT_INSTANCE_ID. Root-scoped services provided below (LoggerService,
      // and SavedChatsService's LoggerService dependency) inject AGENT_INSTANCE_ID *non-optionally*,
      // so the root injector must resolve it or element construction throws NG0201. `AgentInjector`
      // re-provides AGENT_INSTANCE_ID per instance (agent.injector.ts), so this empty default only
      // ever applies to instance-agnostic root services — multi-instance isolation is preserved.
      { provide: AGENT_INSTANCE_ID, useValue: '' },
      { provide: LoggerService, useClass: LoggerService },
      { provide: SavedChatsService, useClass: SavedChatsService },

      // Library defaults (agent JSON name, renderer/tool-card plugins, shiki, debug panel,
      // input filters, affordance matrix, toolbar actions, shell surfaces).
      provideDefaultAgentJsonName(),
      provideDefaultRendererPlugins(),
      provideDefaultShikiHighlighterConfig(),
      provideDefaultToolCardPlugins(),
      provideDefaultDebugPresentation(),
      provideDefaultInputFilters(),
      provideDefaultAffordance(),
      provideDefaultAgentToolbarActions(),
      provideDefaultUserToolbarActions(),
      provideDefaultWelcomeComponent(),
      provideDefaultEmptyComponent(),
      provideDefaultErrorComponent(),
      provideDefaultImpersonationComponent(),

      // NOTE: the root AGENT_INSTANCE_ID above is only a fallback ('') for instance-agnostic root
      // services; every element still carries its own `instanceId` input and AgentInjector provides
      // the real per-instance token, keeping the elements multi-instance-safe.

      provideTransloco({
        config: {
          availableLangs: ['en', 'fr', 'de', 'ja'],
          defaultLang: 'en',
          reRenderOnLangChange: true,
          prodMode: !isDevMode(),
          fallbackLang: 'en',
          missingHandler: {
            logMissingKey: true,
            useFallbackTranslation: true
          }
        },
        loader: TranslocoHttpLoader
      }),
      provideTranslocoMessageformat()
    ]
  });

  await login();

  const injector = app.injector;

  customElements.define('sq-agent', createCustomElement(AgentElementWrapper, { injector }));
  customElements.define('sq-saved-chats', createCustomElement(SavedChatsElementWrapper, { injector }));
  customElements.define('sq-saved-chats-dialog', createCustomElement(SavedChatsDialogElementWrapper, { injector }));
  customElements.define('sq-settings', createCustomElement(SettingsElementWrapper, { injector }));

  // --- Runtime language switching (host → elements) ---
  const transloco = injector.get(TranslocoService);

  function normalizeLang(raw: string): string {
    return raw.split('-')[0].toLowerCase();
  }

  function applyLang(raw: string): void {
    const lang = normalizeLang(raw);
    const available = transloco.getAvailableLangs();
    const isAvailable = available.some(l => (typeof l === 'string' ? l : l.id) === lang);
    if (isAvailable) {
      transloco.setActiveLang(lang);
    }
  }

  if (document.documentElement.lang) {
    applyLang(document.documentElement.lang);
  }

  // Confirm every language change to the host from ONE source: transloco itself. This also
  // covers switches made through the sq-settings language dialog, which call setActiveLang
  // directly and never go through applyLang. Subscribed AFTER the initial applyLang so the
  // replayed emission already carries the normalized initial language.
  transloco.langChanges$.subscribe(lang => {
    document.dispatchEvent(new CustomEvent('sinequa-language-changed', { detail: { lang } }));
  });

  document.addEventListener('sinequa-set-language', (event: Event) => {
    const lang = (event as CustomEvent<{ lang: string }>).detail?.lang;
    if (lang) applyLang(lang);
  });

  // Session cleanup for the host-facing 'agent-logout' event, dispatched by the sq-settings
  // logout entry. The Sinequa session lives in the atomic instance bundled into this build,
  // unreachable from the host page, so the bundle ends it; the host owns the UX reaction
  // (redirect, messaging). Registered after the defines: this region runs at most once thanks
  // to the memoized bootstrap and the customElements.get guard at function entry.
  document.addEventListener(AGENT_LOGOUT_EVENT_NAME, () => {
    void logout();
  });
}

// Expose the bootstrap to the host page instead of auto-running it, so the host controls
// timing and passes its config/auth in. Both firing orders are supported: the host can call
// the global directly if it is already defined, or wait for the `sq-agent-elements-loaded` event.
// The call is memoized: the first call wins and every later call receives the SAME promise
// (its options are ignored), so re-entrant hosts (route re-entry, StrictMode-style double
// invocation, defensive double-init) cannot re-authenticate or create a second application.
// A rejected bootstrap clears the memo so the host can retry after, e.g., a bad token.
let bootstrapPromise: Promise<void> | null = null;
(
  window as { __bootstrapSinequaAgentElements?: (options: AgentElementsBootstrapOptions) => Promise<void> }
).__bootstrapSinequaAgentElements = options => {
  bootstrapPromise ??= bootstrapAgentElements(options).catch(err => {
    bootstrapPromise = null;
    throw err;
  });
  return bootstrapPromise;
};
document.dispatchEvent(new CustomEvent('sq-agent-elements-loaded'));
