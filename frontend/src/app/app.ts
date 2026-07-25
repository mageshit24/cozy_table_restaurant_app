import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/footer/footer';
import { Navbar } from './shared/navbar/navbar';
import { DevtoolsGuardService } from './core/services/devtools-guard.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');

  constructor(private readonly devtoolsGuard: DevtoolsGuardService) { }

  // Toggle lives in environment.ts / environment.production.ts —
  // see DevtoolsGuardService for the full explanation. No-ops in dev.
  ngOnInit(): void {
    this.devtoolsGuard.init();
  }

  ngOnDestroy(): void {
    this.devtoolsGuard.destroy();
  }
}
