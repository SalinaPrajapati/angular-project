import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

export interface Crumb {
  label: string;
  link?: string | unknown[];
}

@Component({
  selector: "app-page-header",
  imports: [RouterLink],
  templateUrl: "./page-header.html",
  styleUrl: "./page-header.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class PageHeader {
  readonly eyebrow = input("");
  readonly heading = input.required<string>();
  readonly crumbs = input<Crumb[]>([]);
}
