let lastError: string | null = null;

export const recordError = (error: unknown) => {
  lastError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
};

export const getLastError = () => lastError;

/** Remembers the latest uncaught JS error (in memory only) and still hands it to the previous handler. */
export const installErrorCapture = () => {
  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void } }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    recordError(error);
    previous?.(error, isFatal);
  });
};
