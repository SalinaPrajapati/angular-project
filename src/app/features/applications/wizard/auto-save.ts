import {
  Observable,
  catchError,
  concatMap,
  debounceTime,
  map,
  merge,
  of,
  startWith,
  timeout,
} from "rxjs";

export type SaveState = "saving" | "saved" | "error";

export interface AutoSaveOptions<T> {
  changes$: Observable<unknown>;
  retry$: Observable<unknown>;
  getValue: () => T;
  save: (value: T) => Observable<unknown>;
  debounceMs?: number;
  timeoutMs?: number;
}

export function autoSave<T>(
  options: AutoSaveOptions<T>,
): Observable<SaveState> {
  const {
    changes$,
    retry$,
    getValue,
    save,
    debounceMs = 800,
    timeoutMs = 10_000,
  } = options;

  return merge(changes$.pipe(debounceTime(debounceMs)), retry$).pipe(
    concatMap(() =>
      save(getValue()).pipe(
        timeout(timeoutMs),
        map((): SaveState => "saved"),
        catchError(() => of<SaveState>("error")),
        startWith<SaveState>("saving"),
      ),
    ),
  );
}
