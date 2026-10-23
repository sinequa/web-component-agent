import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AgentInjector, type FilterInput } from '@sinequa/agent';

/**
 * Custom-element wrapper around {@link AgentInjector} (the `<sq-agent>` element).
 *
 * Exposes the agent's per-instance data inputs as settable DOM properties. Rendering is
 * gated on `instanceId` so the host can create the element first and assign the property
 * afterwards (Angular Elements sets properties after element construction). The Agent
 * communicates outward via bubbling DOM CustomEvents (`agent-lifecycle`, `agent-saved-chat`,
 * `agent-error`, ...), so no output bridging is needed.
 */
@Component({
  selector: 'sq-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgentInjector],
  host: { class: 'relative flex size-full' },
  template: `
    @if (isReady()) {
      <AgentInjector
        [instanceId]="instanceId()!"
        [chatId]="chatId()"
        [activeAgent]="activeAgent()"
        [staticFilters]="staticFilters()"
        [preappliedFilters]="preappliedFilters()"
        [userPrompt]="userPrompt()"
        [enabled]="enabled()" />
    }
  `
})
export class AgentElementWrapper {
  /** Agent instance ID, used to resolve the per-instance configuration. Required. */
  readonly instanceId = input<string>();

  /** Optional chat ID to load. Update it at runtime to switch conversations. */
  readonly chatId = input<string>();

  /**
   * The agent to boot with (one of the configured switchable agents, else the default boots and
   * `agent-lifecycle` reports the fallback) and to switch to on later changes, keeping the conversation.
   */
  readonly activeAgent = input<string>();

  /**
   * Invisible Enterprise Search scope (a filter object or an array of filters), AND-ed into the facet
   * lists and the agent payload. Property only: set it as an object, an attribute string is ignored.
   */
  readonly staticFilters = input<FilterInput>();

  /**
   * Filters the Enterprise Search selection starts from on every fresh session and agent change,
   * shown checked and as chips. Property only: set it as an object, an attribute string is ignored.
   */
  readonly preappliedFilters = input<FilterInput>();

  /** Text placed in the composer on every fresh session (never on a loaded saved chat). */
  readonly userPrompt = input<string>();

  /** One-shot gate: the Agent is created on the first `true`. Defaults to `true`. */
  readonly enabled = input(true, { transform: booleanAttribute });

  protected readonly isReady = computed(() => !!this.instanceId());
}
