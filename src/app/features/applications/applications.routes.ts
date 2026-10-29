import { Routes } from "@angular/router";
import { roleGuard } from "../../core/auth.guard";
import { unsavedChangesGuard } from "../../core/unsaved-changes.guard";

export const APPLICATION_ROUTES: Routes = [
  {
    path: "",
    title: "Applications",
    loadComponent: () =>
      import("./dashboard/dashboard").then((m) => m.Dashboard),
  },
  {
    path: "new",
    title: "New application",
    canMatch: [roleGuard("sales")],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import("./wizard/application-wizard").then((m) => m.ApplicationWizard),
  },
  {
    path: ":id/edit",
    title: "Edit application",
    canMatch: [roleGuard("sales")],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import("./wizard/application-wizard").then((m) => m.ApplicationWizard),
  },
  {
    path: ":id",
    title: "Application",
    loadComponent: () =>
      import("./detail/application-detail").then(
        (m) => m.ApplicationDetailPage,
      ),
  },
];
