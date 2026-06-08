import { Routes } from "@angular/router";
import { adminGuard } from "./core/guards/admin-guard";
import { authGuard } from "./core/guards/auth-guard";
import { ReservationComponent } from "./customer/reservation/reservation";
import { Login } from "./auth/login/login";
import { Register } from "./auth/register/register";
import { CustomerDashboard } from "./customer/dashboard/dashboard";
import { CustomerMenu } from "./customer/menu/menu";
import { CustomerCart } from "./customer/cart/cart";
import { CustomerOrders } from "./customer/orders/orders";
import { CustomerFeedback } from "./customer/feedback/feedback";
import { CustomerProfile } from "./customer/profile/profile";
import { CustomerPayment } from "./customer/payment/payment";
import { AdminDashboard } from "./admin/dashboard/dashboard";
import { AdminMenu } from "./admin/menu/menu";
import { AdminOrders } from "./admin/orders/orders";
import { AdminFeedback } from "./admin/feedback/feedback";
import { AdminReservations } from "./admin/reservations/reservations";

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Customer
  { path: 'customer', component: CustomerDashboard, canActivate: [authGuard] },
  { path: 'customer/menu', component: CustomerMenu, canActivate: [authGuard] },
  { path: 'customer/cart', component: CustomerCart, canActivate: [authGuard] },
  { path: 'customer/orders', component: CustomerOrders, canActivate: [authGuard] },
  { path: 'customer/reservation', component: ReservationComponent, canActivate: [authGuard] },
  { path: 'customer/feedback', component: CustomerFeedback, canActivate: [authGuard] },
  { path: 'customer/profile', component: CustomerProfile, canActivate: [authGuard] },
  { path: 'customer/payment', component: CustomerPayment, canActivate: [authGuard] },

  // Admin
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin/menu', component: AdminMenu, canActivate: [adminGuard] },
  { path: 'admin/orders', component: AdminOrders, canActivate: [adminGuard] },
  { path: 'admin/reservations', component: AdminReservations, canActivate: [adminGuard] },
  { path: 'admin/feedback', component: AdminFeedback, canActivate: [adminGuard] }
];
