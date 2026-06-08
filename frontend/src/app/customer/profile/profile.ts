import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class CustomerProfile implements OnInit {

  /* Profile data */
  profile: any = {};
  loading = true;

  /* Edit mode state */
  editMode = false;
  editData: any = {};
  editErrors: Record<string, string> = {};
  message = '';
  messageType: 'success' | 'error' = 'success';
  savingProfile = false;

  /* Change password */
  showPasswordForm = false;
  oldPassword       = '';
  newPassword       = '';
  confirmPassword   = '';
  passwordErrors: Record<string, string> = {};
  passwordMessage   = '';
  passwordType: 'success' | 'error' = 'success';
  savingPassword    = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadProfile(); }

  /* ── Load ─────────────────────────────────────────────────────────────── */
  loadProfile(): void {
    this.loading = true;
    this.http.get('/api/auth/profile').subscribe({
      next : (data: any) => { this.profile = data; this.loading = false;
        this.cdr.detectChanges(); },
      error: ()          => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  /* ── Edit Profile ─────────────────────────────────────────────────────── */
  startEdit(): void {
    this.editData   = { name: this.profile.name, phone: this.profile.phone };
    this.editMode   = true;
    this.editErrors = {};
    this.message    = '';
  }

  cancelEdit(): void {
    this.editMode   = false;
    this.editErrors = {};
  }

  validateProfileForm(): boolean {
    this.editErrors = {};
    if (!this.editData.name?.trim())
      this.editErrors['name'] = 'Name is required';
    if (!this.editData.phone?.trim())
      this.editErrors['phone'] = 'Phone is required';
    else if (!/^\d{10}$/.test(this.editData.phone))
      this.editErrors['phone'] = 'Phone must be exactly 10 digits';
    return Object.keys(this.editErrors).length === 0;
  }

  saveProfile(): void {
    if (!this.validateProfileForm()) return;
    this.savingProfile = true;
    this.http.put('/api/auth/profile', this.editData).subscribe({
      next: () => {
        this.profile       = { ...this.profile, ...this.editData };
        this.editMode      = false;
        this.savingProfile = false;
        this.showMessage('Profile updated successfully!', 'success');
      },
      error: () => {
        this.savingProfile = false;
        this.showMessage('Failed to update profile. Please try again.', 'error');
      }
    });
  }

  /* ── Change Password ──────────────────────────────────────────────────── */
  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.oldPassword = this.newPassword = this.confirmPassword = '';
    this.passwordErrors  = {};
    this.passwordMessage = '';
  }

  validatePasswordForm(): boolean {
    this.passwordErrors = {};
    if (!this.oldPassword)
      this.passwordErrors['old'] = 'Current password is required';
    if (!this.newPassword)
      this.passwordErrors['new'] = 'New password is required';
    else {
      if (this.newPassword.length < 6)
        this.passwordErrors['new'] = 'Must be at least 6 characters';
      else if (!/[A-Z]/.test(this.newPassword))
        this.passwordErrors['new'] = 'Must contain at least one uppercase letter';
      else if (!/[0-9]/.test(this.newPassword))
        this.passwordErrors['new'] = 'Must contain at least one number';
    }
    if (!this.confirmPassword)
      this.passwordErrors['confirm'] = 'Please confirm your new password';
    else if (this.newPassword !== this.confirmPassword)
      this.passwordErrors['confirm'] = 'Passwords do not match';
    return Object.keys(this.passwordErrors).length === 0;
  }

  changePassword(): void {
    if (!this.validatePasswordForm()) return;
    this.savingPassword = true;
    this.http.post('/api/auth/change-password', {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.savingPassword  = false;
        this.showPasswordForm = false;
        this.oldPassword = this.newPassword = this.confirmPassword = '';
        this.passwordMessage = '✅ Password changed successfully!';
        this.passwordType    = 'success';
        setTimeout(() => this.passwordMessage = '', 4000);
      },
      error: (err) => {
        this.savingPassword  = false;
        this.passwordMessage = err.error?.message || 'Failed to change password';
        this.passwordType    = 'error';
      }
    });
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message     = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  /** Returns user initials for avatar */
  getInitials(): string {
    return (this.profile?.name || 'U').split(' ')
      .map((w: string) => w[0]).join('').toUpperCase().substring(0, 2);
  }
}
