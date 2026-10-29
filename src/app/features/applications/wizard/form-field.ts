import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from "@angular/core";
import {
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";

export interface FieldOption {
  value: string;
  label: string;
}

function messageFor(label: string, errors: ValidationErrors): string {
  if (errors["required"]) return `${label} is required.`;
  if (typeof errors["invalid"] === "string") return errors["invalid"];
  if (errors["email"]) return "Enter a valid email address.";
  if (errors["minlength"])
    return `${label} must be at least ${errors["minlength"].requiredLength} characters.`;
  if (errors["maxlength"])
    return `${label} must be at most ${errors["maxlength"].requiredLength} characters.`;
  if (errors["min"]) return `${label} must be at least ${errors["min"].min}.`;
  return `${label} is not valid.`;
}

@Component({
  selector: "app-form-field",
  imports: [ReactiveFormsModule],
  templateUrl: "./form-field.html",
  changeDetection: ChangeDetectionStrategy.Default,
})
export class FormField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<FormControl>();
  readonly type = input<
    "text" | "email" | "tel" | "url" | "number" | "password" | "select"
  >("text");
  readonly options = input<FieldOption[]>([]);
  readonly hint = input("");
  readonly inputmode = input<string | null>(null);
  readonly autocomplete = input("off");

  protected readonly revealed = signal(false);
  protected readonly required = computed(() =>
    this.control().hasValidator(Validators.required),
  );
  protected readonly inputType = computed(() =>
    this.type() === "password" && this.revealed() ? "text" : this.type(),
  );

  protected error(): string | null {
    const control = this.control();
    return control.touched && control.errors
      ? messageFor(this.label(), control.errors)
      : null;
  }

  protected describedBy(): string | null {
    const ids = [
      this.hint() ? `${this.inputId()}-hint` : "",
      this.error() ? `${this.inputId()}-error` : "",
    ];
    return ids.filter(Boolean).join(" ") || null;
  }
}
