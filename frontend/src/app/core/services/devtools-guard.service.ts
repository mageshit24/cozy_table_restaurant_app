import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * DevtoolsGuardService
 * ─────────────────────────────────────────────────────────────────────────────
 * Deters casual use of the browser DevTools in production builds:
 *   • Blocks the right-click context menu
 *   • Blocks F12, Ctrl+Shift+I / J / C, and Ctrl+U (view-source)
 *   • Detects an already-open DevTools panel (via a timing trick on the
 *     `debugger` statement) and blanks the page with a warning
 *
 * IMPORTANT — read before relying on this for security:
 * None of this can *actually* stop a determined user; DevTools blocking is
 * trivially bypassed (disable JS, use a browser extension, detach a remote
 * debugger, etc.). Treat it as a deterrent / support-ticket-reducer, NOT as
 * a substitute for real security. Anything that must stay secret (API
 * secrets, unpublished business logic, unvalidated trust in the client)
 * must never depend on this service — enforce it server-side instead.
 *
 * Toggle:
 *   Controlled entirely by `environment.enableDevToolsBlock` (see
 *   src/environments/environment.ts vs environment.production.ts). Flip
 *   that one boolean and rebuild — no code changes needed.
 */
@Injectable({ providedIn: 'root' })
export class DevtoolsGuardService {
    private detectionInterval?: ReturnType<typeof setInterval>;

    /** Call once from the root component (see App). No-ops when the toggle is off. */
    init(): void {
        if (!environment.enableDevToolsBlock) return;

        this.blockRightClick();
        this.blockDevToolsShortcuts();
        this.watchForOpenDevTools();
    }

    /** Stops the polling timer — call from ngOnDestroy if you ever tear this down. */
    destroy(): void {
        if (this.detectionInterval) clearInterval(this.detectionInterval);
    }

    private blockRightClick(): void {
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private blockDevToolsShortcuts(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const key = e.key?.toUpperCase();

            const isF12 = key === 'F12';
            const isInspectOrConsole =
                e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 'C');
            const isViewSource = e.ctrlKey && key === 'U';

            if (isF12 || isInspectOrConsole || isViewSource) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    /**
     * Classic timing-based detection: reading `debugger`'s cost is negligible
     * with DevTools closed, but takes noticeably longer (100ms+) once the
     * panel is open and paused-on-debugger is active. Polled at a low
     * frequency to avoid burning CPU.
     */
    private watchForOpenDevTools(): void {
        this.detectionInterval = setInterval(() => {
            const start = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            const elapsed = performance.now() - start;

            if (elapsed > 100) {
                this.handleDevToolsDetected();
            }
        }, 1500);
    }

    private handleDevToolsDetected(): void {
        if (this.detectionInterval) clearInterval(this.detectionInterval);
        document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;' +
            'height:100vh;font-family:sans-serif;text-align:center;padding:2rem;">' +
            '<div><h1>DevTools is disabled on this site</h1>' +
            '<p>Please close the developer console to continue.</p></div></div>';
    }
}
