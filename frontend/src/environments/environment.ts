/**
 * environment.ts — DEVELOPMENT config.
 * Swapped for environment.production.ts at build time via the
 * `fileReplacements` rule in angular.json (production configuration).
 */
export const environment = {
    production: false,

    /**
     * Master switch for the browser-DevTools lockdown (see
     * core/services/devtools-guard.service.ts). Left OFF in dev so you can
     * still use Chrome DevTools / Angular DevTools while building.
     */
    enableDevToolsBlock: false
};
