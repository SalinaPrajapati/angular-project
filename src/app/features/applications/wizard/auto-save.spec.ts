import { Observable, Subject, of, throwError } from "rxjs";
import { SaveState, autoSave } from "./auto-save";

describe("autoSave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(save: (value: string) => Observable<unknown>) {
    const changes$ = new Subject<void>();
    const retry$ = new Subject<void>();
    const states: SaveState[] = [];
    let value = "v0";
    autoSave({
      changes$,
      retry$,
      getValue: () => value,
      save,
      debounceMs: 800,
    }).subscribe((s) => states.push(s));
    return {
      states,
      change: (next: string) => {
        value = next;
        changes$.next();
      },
      retry: () => retry$.next(),
    };
  }

  it("waits until typing stops and saves the latest value once", () => {
    const save = vi.fn(() => of("ok"));
    const { change, states } = setup(save);

    change("a");
    vi.advanceTimersByTime(400);
    change("ab");
    vi.advanceTimersByTime(400);
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("ab");
    expect(states).toEqual(["saving", "saved"]);
  });

  it("reports an error, keeps running, and saves again on retry", () => {
    let fail = true;
    const save = vi.fn(() =>
      fail ? throwError(() => new Error("offline")) : of("ok"),
    );
    const { change, retry, states } = setup(save);

    change("draft");
    vi.advanceTimersByTime(800);
    expect(states).toEqual(["saving", "error"]);

    fail = false;
    retry();
    expect(states).toEqual(["saving", "error", "saving", "saved"]);
    expect(save).toHaveBeenLastCalledWith("draft");
  });

  it("saves again on the next change after a failure", () => {
    let fail = true;
    const save = vi.fn(() =>
      fail ? throwError(() => new Error("offline")) : of("ok"),
    );
    const { change, states } = setup(save);

    change("one");
    vi.advanceTimersByTime(800);
    fail = false;
    change("two");
    vi.advanceTimersByTime(800);

    expect(states.at(-1)).toBe("saved");
    expect(save).toHaveBeenLastCalledWith("two");
  });
});
