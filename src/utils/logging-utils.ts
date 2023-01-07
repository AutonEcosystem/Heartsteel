export function sendLogs(message: string, isError: boolean) {
  if (isError) {
    message = "ERROR: " + message;
  }

  const now = new Date(Date.now());
  console.log(
    `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] ${message}`
  );
}
