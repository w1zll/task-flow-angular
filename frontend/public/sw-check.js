const TASKFLOW_SW_CHECK_VERSION = 'taskflow-sw-check-v1';

self.addEventListener('install', (event) => {
  console.info(`[TaskFlow SW check] Installing ${TASKFLOW_SW_CHECK_VERSION}`);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.info(`[TaskFlow SW check] Active ${TASKFLOW_SW_CHECK_VERSION}`);
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'TASKFLOW_SW_PING') {
    return;
  }

  const response = {
    type: 'TASKFLOW_SW_VERSION',
    version: TASKFLOW_SW_CHECK_VERSION,
    cacheEnabled: false,
    offlineRefreshSupported: false,
  };
  const replyPort = event.ports?.[0];

  if (replyPort) {
    replyPort.postMessage(response);
  } else {
    event.source?.postMessage(response);
  }
});
