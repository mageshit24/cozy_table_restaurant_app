import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../services/feedback';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class AdminFeedback implements OnInit {

  feedbacks: any[]   = [];
  loading            = true;

  /* Controls */
  sortOrder          = 'desc';   // 'asc' | 'desc'
  ratingFilter       = '';       // '' | '1' – '5'

  /* Derived stats */
  averageRating      = 0;

  constructor(private feedbackService: FeedbackService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadFeedbacks(); }

  loadFeedbacks(): void {
    this.loading = true;
    this.feedbackService.getAllFeedback(this.sortOrder, this.ratingFilter).subscribe({
      next: (data: any[]) => {
        this.feedbacks = data;
        this.loading   = false;
        this.cdr.detectChanges();
        this.computeStats();
      },
      error: () => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  onSortChange():   void { this.loadFeedbacks(); }
  onRatingFilter(): void { this.loadFeedbacks(); }
  clearFilters():   void { this.sortOrder = 'desc'; this.ratingFilter = ''; this.loadFeedbacks(); }

  private computeStats(): void {
    if (!this.feedbacks.length) { this.averageRating = 0; return; }
    const sum        = this.feedbacks.reduce((s, fb) => s + (fb.rating || 0), 0);
    this.averageRating = Math.round((sum / this.feedbacks.length) * 10) / 10;
  }

  /** Returns array of star characters for a given numeric rating */
  getStars(rating: number): { char: string; filled: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({
      char:   i < rating ? '★' : '☆',
      filled: i < rating
    }));
  }

  getInitial(name: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }
}
