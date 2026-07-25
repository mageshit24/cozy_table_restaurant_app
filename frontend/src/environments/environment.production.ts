/**
 * environment.production.ts — PRODUCTION config.
 * Angular swaps this in for environment.ts automatically for
 * `ng build` / `ng build --configuration production` via the
 * `fileReplacements` rule in angular.json.
 */
export const environment = {
    production: true,

    /**
     * Set this to `false` any time you need to ship a build with DevTools
     * left open (e.g. to debug a production issue) without touching any
     * component code — flip the flag, rebuild, redeploy.
     */
    enableDevToolsBlock: true
};
