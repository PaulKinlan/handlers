// A small CSV reader and writer, RFC 4180 style: commas, double quotes around
// fields that need them, "" for a quote inside a field, CRLF or LF line ends.
// Used by the chart app, and tested by test/files.unit.mjs.

export function parse(text) {
  const rows = [];
  let row = [], field = "", quoted = false, i = 0;
  const s = String(text);
  while (i < s.length) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"' && field === "") { quoted = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r" && s[i + 1] === "\n") i++;
    if (c === "\n" || c === "\r") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const needsQuotes = /[",\r\n]|^\s|\s$/;
export function serialize(rows) {
  return rows.map((row) => row.map((v) => {
    const value = String(v ?? "");
    return needsQuotes.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value;
  }).join(",")).join("\n") + "\n";
}

/** The first column after the first whose values below the header are all numbers, or -1. */
export function numericColumn(rows) {
  if (rows.length < 2) return -1;
  const width = Math.max(...rows.map((r) => r.length));
  for (let col = 1; col < width; col++) {
    const values = rows.slice(1).map((r) => (r[col] ?? "").trim()).filter(Boolean);
    if (values.length && values.every((v) => Number.isFinite(Number(v)))) return col;
  }
  return -1;
}
