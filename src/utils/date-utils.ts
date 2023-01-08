export function currentTimestampSeconds(): number {
  return toTimestampSeconds(new Date(Date.now()));
}

export function toTimestampSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function toDate(timestampSeconds: number): Date {
  return new Date(timestampSeconds * 1000);
}
