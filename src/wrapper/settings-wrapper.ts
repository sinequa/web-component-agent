import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { SettingsComponent } from '@sinequa/agent';
import { OverrideUserDialogComponent, PrincipalStore } from '@sinequa/atomic-angular';
import { AvatarComponent, AvatarFallbackComponent, MenuComponent, MenuContentComponent, UserIcon, UserSecretIcon } from '@sinequa/ui';

/**
 * Custom-element wrapper around {@link SettingsComponent} (the `<sq-settings>` element).
 *
 * Renders a user button that opens a popup menu holding the impersonation entry (when the
 * principal is allowed to impersonate) and the settings panel itself — the same composition
 * the demo app's sidebar footer uses.
 *
 * The menu surface is deliberately the light `bg-menu-bg` panel: {@link SettingsComponent}
 * styles its rows with the `primary-foreground-*` tokens, which only meet contrast on that
 * surface. Only the trigger lives on the dark sidebar, so it uses the `sidebar-*` tokens.
 */
@Component({
  selector: 'sq-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SettingsComponent,
    OverrideUserDialogComponent,
    MenuComponent,
    MenuContentComponent,
    AvatarComponent,
    AvatarFallbackComponent,
    UserIcon,
    UserSecretIcon,
    TranslocoPipe
  ],
  templateUrl: './settings-wrapper.html'
})
export class SettingsElementWrapper {
  private readonly principal = inject(PrincipalStore);

  /** Initial state of the debug mode; the panel's own switch toggles it from there. */
  readonly debug = input(false, { transform: booleanAttribute });

  /** The OOTB impersonation dialog (from `@sinequa/atomic-angular`), declared alongside the menu. */
  private readonly overrideUserDialog = viewChild(OverrideUserDialogComponent);

  /** True when the current user may impersonate (admin and not already impersonating). */
  protected readonly allowUserOverride = this.principal.allowUserOverride;
  /** True while an impersonation is active. */
  protected readonly isOverridingUser = this.principal.isOverridingUser;

  protected readonly email = computed(() => this.principal.principal().email);
  protected readonly fullname = computed(() => this.principal.principal().fullName);
  protected readonly initials = computed(
    () =>
      this.fullname()
        ?.split(' ')
        ?.map(word => word[0]?.toUpperCase())
        ?.join('') ?? undefined
  );

  /** Opens the impersonation dialog. */
  protected openOverride(): void {
    this.overrideUserDialog()?.open();
  }

  /** Reverts an active impersonation back to the real user. */
  protected revertOverride(): void {
    this.overrideUserDialog()?.handleOverrideUser();
  }
}
