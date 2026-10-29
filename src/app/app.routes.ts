import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/auth.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "applications" },
  {
    path: "login",
    canMatch: [guestGuard],
    loadChildren: () =>
      import("./features/auth/auth.routes").then((m) => m.AUTH_ROUTES),
  },
  {
    path: "applications",
    canMatch: [authGuard],
    loadChildren: () =>
      import("./features/applications/applications.routes").then(
        (m) => m.APPLICATION_ROUTES,
      ),
  },
  {
    path: "access-denied",
    title: "Access denied",
    data: {
      eyebrow: "Error 403",
      heading: "Access denied",
      message: "Your role does not have access to that page.",
    },
    loadComponent: () => import("./pages/notice/notice").then((m) => m.Notice),
  },
  {
    path: "**",
    title: "Page not found",
    data: {
      eyebrow: "Error 404",
      heading: "Page not found",
      message: "The page you are looking for does not exist.",
    },
    loadComponent: () => import("./pages/notice/notice").then((m) => m.Notice),
  },
];
