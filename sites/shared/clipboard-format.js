// Shared custom clipboard format for moving a structured task list from Tasks
// to Notes across origins. The "web " prefix marks it as a Web Custom Format
// that the browser passes through unsanitised alongside a text/plain fallback.
export const TASKS_MIME = "web application/x-webtasks+json";

export function formatTasksMarkdown(tasks) {
  return tasks.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n");
}

export function encodeTasks(tasks) {
  const clean = (Array.isArray(tasks) ? tasks : [])
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ text: t.text.trim(), done: !!t.done }));
  return {
    plain: formatTasksMarkdown(clean),
    json: JSON.stringify({ app: "handlers-tasks", version: 1, tasks: clean }),
    count: clean.length,
  };
}

export function decodeTasks(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || !Array.isArray(data.tasks)) return null;
  const tasks = data.tasks
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ text: t.text.trim(), done: !!t.done }));
  const done = tasks.filter((t) => t.done).length;
  return {
    app: typeof data.app === "string" ? data.app : "unknown",
    tasks,
    open: tasks.length - done,
    done,
    markdown: formatTasksMarkdown(tasks),
  };
}
