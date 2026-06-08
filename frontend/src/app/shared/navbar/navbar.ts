import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOpen = false;

  constructor(
    public authService: AuthService,
    public cartService: CartService,
    private router: Router
  ) {
    // Close mobile menu on navigation
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen = false);
  }

  get role(): string | null      { return this.authService.getUserRole(); }
  get isLoggedIn(): boolean      { return this.authService.isLoggedIn(); }
  get cartCount(): number        { return this.cartService.getCart().length; }

  toggleMenu()  { this.menuOpen = !this.menuOpen; }

  logout() {
    this.authService.logout();
    this.menuOpen = false;
  }

  // Close mobile menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar')) this.menuOpen = false;
  }
}
