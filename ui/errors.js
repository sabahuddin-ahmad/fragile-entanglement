// Keep backend tracebacks available in the console, with actionable page text.
export function experimentError(error, { is_ionq = false } = {}) {
  const message = String(error?.message ?? error);
  if (/failed to fetch|networkerror|connectionerror|connection aborted|load failed/i.test(message)) {
    return is_ionq
      ? 'Could not connect to the selected IonQ backend. No new results were loaded. Stop and restart Qollab, then select Built-in simulator to continue. If that works, check IonQ access with Qollab before retrying IonQ.'
      : 'Could not connect to the selected backend. No new results were loaded. Check your connection, then stop and restart Qollab and select the backend again.';
  }
  // A Python traceback ends with the exception type and its useful message.
  const lastLine = message.trim().split('\n').filter((line) => line.trim()).at(-1) ?? 'Unknown error';
  const summary = lastLine.length > 300 ? `${lastLine.slice(0, 297)}…` : lastLine;
  return `Experiment failed: ${summary}. No new results were loaded.`;
}
