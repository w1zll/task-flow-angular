# Таск-трекер TaskFlow на Angular 21

Ссылка на онлайн-демо - <https://task-flow-angular.vercel.app>

## Стек frontend

- Angular 21.2.18;
- Angular CLI, build и SSR 21.2.19;
- TypeScript 5.9.3;
- RxJS 7.8;
- NgRx SignalStore 21.1.1;
- Tailwind CSS 4;
- Transloco 8.4.0;
- Angular CDK 21.2.14 без Angular Material;
- Socket.IO Client 4.8.3;
- ng-openapi-gen 1.0.5;
- Angular Service Worker 21.2.18.

## Стек Angular 21

- standalone components и lazy routes;
- `ChangeDetectionStrategy.OnPush` и zoneless runtime;
- Signals: `signal`, `computed`, `effect`;
- control flow: `@if`, `@for`, `@switch`;
- `inject()`, `DestroyRef` и `takeUntilDestroyed`;
- SignalStore обеспечивает server-state cache, stale-while-revalidate и optimistic rollback;
- SSR, hydration и prerender.

## Socket.IO

- REST/auth используют same-origin `/api`, а Socket.IO подключается напрямую к backend;
- через сокеты выполняются изменение/завершение, перемещение и перестановка задач;
- создание и удаление задач выполняются через REST, а socket events согласуют cache между вкладками;
- операции с колонками остаются REST-only.
