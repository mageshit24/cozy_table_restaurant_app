import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MenuService } from '../../services/menu';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class AdminMenu implements OnInit {
menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  newItem: Partial<MenuItem> = { name: '', price: 0, description: '', category: '' };
  errors: Record<string, string> = {};
  editMode = false; editId: number | null = null;
  selectedFile: File | null = null; imagePreview: string | null = null; imageError = '';
  message = ''; messageType: 'success' | 'error' = 'success';
  tableSearch = ''; tableCategory = '';
  deletingId: number | null = null;
  loading = false;

  constructor(private menuService: MenuService, private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void { this.loadMenu(); }

  loadMenu(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => { this.menuItems = data; this.applyTableFilter(); },
      error: () => this.showMessage('Failed to load menu items', 'error')
    });
  }

  applyTableFilter(): void {
    let items = [...this.menuItems];
    if (this.tableSearch)
      items = items.filter(i => i.name.toLowerCase().includes(this.tableSearch.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(this.tableSearch.toLowerCase()));
    if (this.tableCategory)
      items = items.filter(i => i.category === this.tableCategory);
    this.filteredItems = items;
  }

  onImageSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { this.imageError = 'Only JPG, PNG, WEBP, or GIF allowed.'; return; }
    if (file.size > 5 * 1024 * 1024) { this.imageError = 'Image must be < 5 MB.'; return; }
    this.imageError = ''; this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.imagePreview = e.target.result;
    reader.readAsDataURL(file);
  }

  removeImage(): void { this.selectedFile = null; this.imagePreview = null; this.imageError = ''; }

  validateForm(): boolean {
    this.errors = {};
    if (!this.newItem.name?.trim()) this.errors['name'] = 'Item name is required';
    if (!this.newItem.price || this.newItem.price <= 0) this.errors['price'] = 'Price must be > 0';
    if (!this.newItem.category) this.errors['category'] = 'Please select a category';
    return Object.keys(this.errors).length === 0;
  }

  saveMenu(): void {
    if (!this.validateForm()) return;
    const formData = new FormData();
    Object.entries(this.newItem).forEach(([k, v]) => { if (v !== null && v !== undefined) formData.append(k, String(v)); });
    if (this.selectedFile) formData.append('image', this.selectedFile);
    this.loading = true;
    const req$ = this.editMode && this.editId
      ? this.http.put(`/api/menu/${this.editId}`, formData)
      : this.http.post('/api/menu', formData);
    req$.subscribe({
      next: () => { this.loading = false;
        this.cdr.detectChanges(); this.showMessage(this.editMode ? 'Updated!' : 'Added!', 'success'); this.resetForm(); this.loadMenu(); },
      error: () => { this.loading = false;
        this.cdr.detectChanges(); this.showMessage('Failed to save item.', 'error'); }
    });
  }

  editItem(item: MenuItem): void {
    this.newItem = { name: item.name, price: item.price, description: item.description || '', category: item.category || '' };
    this.editId = item.id; this.editMode = true;
    this.imagePreview = this.getImageUrl(item);
    this.selectedFile = null; this.errors = {}; this.message = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmDelete(id: number): void { this.deletingId = id; }
  cancelDelete(): void { this.deletingId = null; }

  deleteItem(): void {
    if (!this.deletingId) return;
    this.menuService.deleteMenu(this.deletingId).subscribe({
      next: () => { this.showMessage('Item deleted.', 'success'); this.deletingId = null; this.loadMenu(); },
      error: () => { this.showMessage('Failed to delete.', 'error'); this.deletingId = null; }
    });
  }

  resetForm(): void {
    this.newItem = { name: '', price: 0, description: '', category: '' };
    this.editMode = false; this.editId = null;
    this.selectedFile = null; this.imagePreview = null; this.imageError = ''; this.errors = {};
  }

  getImageUrl(item: MenuItem): string {
    if (item.imageUrl) return item.imageUrl;

    if (item.image) {
      return `/uploads/${item.image}`;
    }

    return 'https://placehold.co/60x60/f5f5f7/6b7280?text=No+Img';
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg; this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }
}
