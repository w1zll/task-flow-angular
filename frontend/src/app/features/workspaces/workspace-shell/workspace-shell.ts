import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { WorkspaceSwitcher } from '@features/workspaces/workspace-switcher/workspace-switcher';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

interface ScrollLockSnapshot {
  readonly bodyOverflow: string;
  readonly bodyPaddingRight: string;
  readonly bodyPosition: string;
  readonly bodyTop: string;
  readonly bodyWidth: string;
  readonly htmlScrollBehavior: string;
  readonly scrollY: number;
}

@Component({
  selector: 'app-workspace-shell',
  imports: [
    ErrorState,
    LoadingSkeleton,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
    WorkspaceSwitcher,
  ],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceShell implements OnDestroy, OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private scrollLockSnapshot: ScrollLockSnapshot | null = null;
  private drawerTrigger: HTMLElement | null = null;
  protected readonly store = inject(WorkspaceStore);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly workspaceId = computed(() => this.paramMap().get('workspaceId') ?? '');
  protected readonly workspace = computed(() =>
    this.store.workspaces().find((workspace) => workspace.id === this.workspaceId()),
  );
  protected readonly workspaceBoards = computed(() => this.store.boardsFor(this.workspaceId()));
  protected readonly drawerOpen = signal(false);
  protected readonly drawerTop = signal(0);

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  protected toggleDrawer(event: MouseEvent): void {
    if (this.drawerOpen()) {
      this.closeDrawer(true);
      return;
    }

    const button = event.currentTarget as HTMLElement;
    this.drawerTrigger = button;
    const mobileBar = button.closest<HTMLElement>('.shell__mobile-bar');
    this.drawerTop.set(mobileBar?.getBoundingClientRect().bottom ?? 0);
    this.drawerOpen.set(true);
    this.lockPageScroll();
  }

  protected closeDrawer(restoreFocus = false): void {
    this.drawerOpen.set(false);
    this.unlockPageScroll();
    if (restoreFocus && this.isBrowser) {
      this.drawerTrigger?.focus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected closeDrawerFromKeyboard(event: Event): void {
    if (!this.drawerOpen()) return;

    event.preventDefault();
    event.stopPropagation();
    this.closeDrawer(true);
  }

  protected async selectWorkspace(workspaceId: string): Promise<void> {
    try {
      await this.store.switchActive(workspaceId);
      this.closeDrawer();
      await this.router.navigate(['/workspaces', workspaceId, 'boards']);
    } catch {}
  }

  protected retry(): void {
    void this.store.load(true);
  }

  protected goToCatalog(): void {
    void this.router.navigate(['/workspaces']);
  }

  private async initialize(): Promise<void> {
    await this.store.load();
    const workspace = this.workspace();

    if (workspace && !workspace.isActive) {
      try {
        await this.store.switchActive(workspace.id);
      } catch {}
    }
  }

  private lockPageScroll(): void {
    if (!this.isBrowser || this.scrollLockSnapshot) return;

    const body = this.document.body;
    const html = this.document.documentElement;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    const bodyPaddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    const scrollY = window.scrollY;

    this.scrollLockSnapshot = {
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlScrollBehavior: html.style.scrollBehavior,
      scrollY,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    }
  }

  private unlockPageScroll(): void {
    if (!this.isBrowser || !this.scrollLockSnapshot) return;

    const body = this.document.body;
    const html = this.document.documentElement;
    const { scrollY } = this.scrollLockSnapshot;
    body.style.overflow = this.scrollLockSnapshot.bodyOverflow;
    body.style.paddingRight = this.scrollLockSnapshot.bodyPaddingRight;
    body.style.position = this.scrollLockSnapshot.bodyPosition;
    body.style.top = this.scrollLockSnapshot.bodyTop;
    body.style.width = this.scrollLockSnapshot.bodyWidth;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = this.scrollLockSnapshot.htmlScrollBehavior;
    this.scrollLockSnapshot = null;
  }
}
