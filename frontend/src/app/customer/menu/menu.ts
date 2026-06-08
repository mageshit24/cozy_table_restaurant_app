import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CartService } from '../../services/cart';
import { MenuItem, MenuService } from '../../services/menu';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class CustomerMenu implements OnInit, OnDestroy {
menuItems:     MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  loading = true;

  searchTerm        = '';
  selectedCategory  = '';
  categories = ['starters', 'mains', 'desserts', 'beverages', 'alcoholic-beverages'];

  addedItemId: number | null = null;

  private searchSubject = new Subject<string>();
  private destroy$      = new Subject<void>();

  constructor(private menuService: MenuService, private cartService: CartService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadMenu());

    this.loadMenu();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMenu(): void {
    this.loading = true;
    this.menuService.getMenu(
      this.searchTerm     || undefined,
      this.selectedCategory || undefined
    ).subscribe({
      next:  data => { this.filteredItems = data; this.loading = false;
        this.cdr.detectChanges(); },
      error: ()   => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  onSearchChange(): void  { this.searchSubject.next(this.searchTerm); }

  onCategoryChange(cat: string): void {
    this.selectedCategory = this.selectedCategory === cat ? '' : cat;
    this.loadMenu();
  }

  clearFilters(): void {
    this.searchTerm       = '';
    this.selectedCategory = '';
    this.loadMenu();
  }

  addToCart(item: MenuItem): void {
    this.cartService.addToCart(item);
    this.addedItemId = item.id;
    setTimeout(() => this.addedItemId = null, 1500);
  }

  /**
   * Prefer the fully-resolved imageUrl returned by the backend.
   * Fall back to constructing from raw filename via the Angular proxy (/uploads/...).
   * If neither exists, show a placeholder.
   */
  getImageUrl(item: MenuItem): string {
    if (item.imageUrl) return item.imageUrl;
    if (item.image)    return `/uploads/${item.image}`;
    return 'https://placehold.co/320x200/f5f5f7/6b7280?text=No+Image';
  }
}
