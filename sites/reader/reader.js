// The part of the Reader app that other apps can reach.
//
// The reader holds the file. What it opened arrives in one of four ways: the
// operating system (file_handlers + launchQueue), the file picker, a drop, or
// the sample file it writes to its own origin private file system. Only a
// FileSystemFileHandle can be written back to; a plain File cannot.
//
// A handle cannot be sent to another origin: postMessage of one to a page on
// another origin ends in a messageerror on the receiving side. So the reader
// never sends it. It lends a port with four calls on it instead, and decides
// for itself whether a write goes through.
//
// No DOM here, so that Node can test it (test/files.unit.mjs).

const refused = (message) => new DOMException(message, "NotAllowedError");

export class Reader {
  #doc = null;          // { handle, file, text, via }
  #saving = false;      // the person who opened the file said the other app may save
  #listeners = new Set();
  writes = 0;

  /** @param {{ onwrite?(info: object): void, onrefuse?(error: Error): void }} [hooks] */
  constructor({ onwrite, onrefuse } = {}) { this.onwrite = onwrite; this.onrefuse = onrefuse; }

  /** @param {{ handle?: FileSystemFileHandle, file?: File, via: string }} entry */
  async open({ handle = null, file = null, via }) {
    if (!file) file = await handle.getFile();
    this.#doc = { handle, file, text: await file.text(), via };
    this.#emit();
    return this.describe();
  }

  get opened() { return this.#doc !== null; }
  /** The page that owns the reader may ask for the handle. Nothing lent reaches this. */
  get handle() { return this.#doc?.handle ?? null; }

  /** Saving is off for every new link and every new file until the person turns it on. */
  allowSaving(on) { this.#saving = Boolean(on); this.#emit(); }
  get saving() { return this.#saving; }

  describe() {
    if (!this.#doc) return null;
    const { file, handle, via } = this.#doc;
    return { name: file.name, type: file.type || guessType(file.name), size: file.size, lastModified: file.lastModified, via, writable: Boolean(handle), saving: this.#saving && Boolean(handle) };
  }

  text() {
    if (!this.#doc) throw new DOMException("No file is open in the reader", "NotFoundError");
    return this.#doc.text;
  }

  /** Called by the other app. The reader checks everything; the caller is trusted with nothing. */
  async write(text) {
    try {
      const info = await this.#write(text);
      this.onwrite?.(info);
      return info;
    } catch (error) {
      this.onrefuse?.(error);
      throw error;
    }
  }

  async #write(text) {
    if (typeof text !== "string") throw new TypeError("write() takes a string");
    if (text.length > 1_000_000) throw new RangeError("write() takes at most 1,000,000 characters");
    const doc = this.#doc;
    if (!doc) throw new DOMException("No file is open in the reader", "NotFoundError");
    if (!doc.handle) throw refused("This file was opened without a handle, so it cannot be written back. Open it from the file manager, the picker or a drop instead.");
    if (!this.#saving) throw refused("The reader has not allowed saving. Tick \"Let the other app save\" in the reader first.");
    if (doc.handle.queryPermission && (await doc.handle.queryPermission({ mode: "readwrite" })) !== "granted") {
      throw refused("The browser has not given the reader permission to write to this file.");
    }
    const writable = await doc.handle.createWritable();
    await writable.write(text);
    await writable.close();
    this.writes++;
    await this.open({ handle: doc.handle, via: doc.via });
    return this.describe();
  }

  /**
   * Every document the reader holds, starting with the current one: when the
   * operating system hands an open reader window another file (launch_handler
   * "focus-existing"), the other app sees it here without a new port.
   */
  async *documents() {
    let wake = null, pending = this.#doc ? 1 : 0;
    const listener = () => { pending++; wake?.(); };
    this.#listeners.add(listener);
    try {
      for (;;) {
        if (!pending) await new Promise((resolve) => (wake = resolve));
        wake = null;
        pending = 0;
        if (this.#doc) yield { ...this.describe(), text: this.#doc.text };
      }
    } finally {
      this.#listeners.delete(listener);
    }
  }

  /** What the reader lends to another app. The port reaches these four names and nothing else. */
  lend() {
    return {
      describe: () => this.describe(),
      text: () => this.text(),
      write: (text) => this.write(text),
      documents: () => this.documents(),
    };
  }

  #emit() { for (const listener of this.#listeners) listener(); }
}

export const LENT = ["describe", "text", "write", "documents"];

export function guessType(name) {
  const ext = String(name).split(".").pop().toLowerCase();
  return { csv: "text/csv", md: "text/markdown", txt: "text/plain" }[ext] || "application/octet-stream";
}
