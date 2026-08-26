import { booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input } from '@angular/core';

import { SavedChat, SavedChatComponent } from '@sinequa/agent';

/**
 * Custom-element wrapper around {@link SavedChatComponent} (the `<sq-saved-chats>` element).
 *
 * Renders the saved-conversations list for a given `instanceId`. The component's
 * `chatSelected` output is re-dispatched as a bubbling `sq-chat-selected` DOM CustomEvent
 * (detail = the selected {@link SavedChat}) so a non-Angular host can react, typically by
 * setting `chatId` on the `<sq-agent>` element.
 */
@Component({
  selector: 'sq-saved-chats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SavedChatComponent],
  host: { class: 'block size-full' },
  template: `
    @if (isReady()) {
      <SavedChat
        [instanceId]="instanceId()!"
        [activeChatId]="activeChatId()"
        [searchText]="searchText()"
        [readonly]="readonly()"
        (chatSelected)="onChatSelected($event)" />
    }
  `
})
export class SavedChatsElementWrapper {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

  /** Agent instance ID whose saved chats are listed. Required. */
  readonly instanceId = input<string>();

  /** ID of the currently active chat, used to highlight the active row. */
  readonly activeChatId = input<string>();

  /** Optional text filter applied to the chat list. */
  readonly searchText = input<string>();

  /** When true, hides the rename and delete actions. */
  readonly readonly = input(false, { transform: booleanAttribute });

  protected readonly isReady = computed(() => !!this.instanceId());

  protected onChatSelected(chat: SavedChat): void {
    this.host.dispatchEvent(
      new CustomEvent<SavedChat>('sq-chat-selected', { detail: chat, bubbles: true, composed: true })
    );
  }
}
