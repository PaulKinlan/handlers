import { test } from "node:test";
import assert from "node:assert/strict";
import { TASKS_MIME, encodeTasks, decodeTasks, formatTasksMarkdown } from "../sites/shared/clipboard-format.js";

test("custom clipboard MIME type uses the required web prefix", () => {
  assert.ok(TASKS_MIME.startsWith("web "));
});

test("encodeTasks and decodeTasks round-trip open and done tasks", () => {
  const input = [
    { text: "  Buy milk  ", done: false },
    { text: "Write tests", done: true },
    { text: "   ", done: false },
  ];
  const encoded = encodeTasks(input);
  assert.equal(encoded.count, 2);
  assert.equal(encoded.plain, "- [ ] Buy milk\n- [x] Write tests");

  const decoded = decodeTasks(encoded.json);
  assert.equal(decoded.app, "handlers-tasks");
  assert.equal(decoded.open, 1);
  assert.equal(decoded.done, 1);
  assert.deepEqual(decoded.tasks, [
    { text: "Buy milk", done: false },
    { text: "Write tests", done: true },
  ]);
  assert.equal(decoded.markdown, formatTasksMarkdown(decoded.tasks));
});

test("decodeTasks rejects malformed JSON and wrong shapes", () => {
  assert.equal(decodeTasks("not json"), null);
  assert.equal(decodeTasks("{}"), null);
  assert.equal(decodeTasks(JSON.stringify({ tasks: "nope" })), null);
});
