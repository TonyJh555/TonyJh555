/** Tiny CSV helpers — build a spreadsheet-safe string and trigger a download. */

/** Escape one field: quote it when it contains a comma, quote, or newline. */
function escapeField(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build CSV text from a header row and body rows. */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeField).join(","));
  return lines.join("\n");
}

/** Browser-only: download `content` as a file. No-op on the server. */
export function downloadCSV(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
