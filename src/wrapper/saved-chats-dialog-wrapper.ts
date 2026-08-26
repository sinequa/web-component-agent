import { booleanAttribute, ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, viewChild } from '@angular/core';

import { SavedChatsDialogComponent } from '@sinequa/agent';

/**
 * Custom-element wrapper around {@link SavedChatsDialogComponent} (the `<sq-saved-chats-dialog>`
 * element).
 *
 * Angular Elements exposes inputs as properties but not component methods, so the dialog's
 * imperative `open()` / `close()` are driven by the boolean `open` input: an effect mirrors
 * the property onto the underlying dialog. The dialog also closes ITSELF (Escape, outside
 * click, close button, chat selection); the wrapper then resets its own `open` property to
 * `false` and re-dispatches a bubbling `sq-dialog-closed` CustomEvent so the host can react.
 */
@Component({
  selector: 'sq-saved-chats-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SavedChatsDialogComponent],
  template: `<SavedChatsDialog [instanceId]="instanceId()" (closed)="onClosed()" />`
})
export class SavedChatsDialogElementWrapper {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement & { open?: boolean };

  /** Agent instance ID forwarded to the inner dialog. */
  readonly instanceId = input<string>();

  /** Set to `true` to open the dialog, `false` to close it. Reset to `false` on every close. */
  readonly open = input(false, { transform: booleanAttribute });

  private readonly dialog = viewChild(SavedChatsDialogComponent);

  constructor() {
    effect(() => {
      const dialog = this.dialog();
      if (!dialog) return;
      if (this.open()) dialog.open();
      else dialog.close();
    });
  }

  protected onClosed(): void {
    // Write `false` back through the custom element's OWN property setter: it routes through
    // ComponentRef.setInput, which refreshes the framework's previous-value cache. Without
    // this, `el.open = true` after a self-close (Escape, outside click, chat selection) would
    // be dropped by setInput's Object.is equality check and the dialog could never reopen.
    // For a host-driven close (`el.open = false`) the write is an equal-value no-op.
    this.host.open = false;
    this.host.dispatchEvent(new CustomEvent('sq-dialog-closed', { bubbles: true, composed: true }));
  }
}
