import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AgentInjector } from '@sinequa/agent';

/**
 * Custom-element wrapper around {@link AgentInjector} (the `<sq-agent>` element).
 *
 * Exposes the agent's per-instance data inputs as settable DOM properties. Rendering is
 * gated on `instanceId` so the host can create the element first and assign the property
 * afterwards (Angular Elements sets properties after element construction). The Agent
 * communicates outward via bubbling DOM CustomEvents, so no output bridging is needed.
 */
@Component({
  selector: 'sq-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgentInjector],
  host: { class: 'relative flex size-full' },
  template: `
    @if (isReady()) {
      <AgentInjector [instanceId]="instanceId()!" [chatId]="chatId()" [enabled]="enabled()" />
    }
  `
})
export class AgentElementWrapper {
  /** Agent instance ID, used to resolve the per-instance configuration. Required. */
  readonly instanceId = input<string>();

  /** Optional chat ID to load. Update it at runtime to switch conversations. */
  readonly chatId = input<string>();

  /** One-shot gate: the Agent is created on the first `true`. Defaults to `true`. */
  readonly enabled = input(true, { transform: booleanAttribute });

  protected readonly isReady = computed(() => !!this.instanceId());
}
