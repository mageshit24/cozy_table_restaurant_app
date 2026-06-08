import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Feedback, FeedbackService } from '../../services/feedback';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class CustomerFeedback {

  rating: number = 5;
  comment: string = '';
  message: string = '';

  constructor(private feedbackService: FeedbackService) { }

  submitFeedback() {

    const data: Feedback = {
      rating: this.rating,
      comment: this.comment
    };

    this.feedbackService.addFeedback(data).subscribe({
      next: () => {
        this.message = "Feedback submitted successfully!";
        this.comment = '';
        this.rating = 5;
      },
      error: (err: any) => {
        console.error(err);
        this.message = "Failed to submit feedback";
      }
    });
  }
}
