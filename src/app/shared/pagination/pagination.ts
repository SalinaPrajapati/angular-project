import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { pageWindow } from "./page-window";

@Component({
  selector: "app-pagination",
  templateUrl: "./pagination.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() =>
    pageWindow(this.page(), this.totalPages()),
  );

  protected go(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }
}
