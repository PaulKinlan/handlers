// For the os-file-handoff page: post a real FileSystemFileHandle, made in this
// origin's private file system, to a frame on this origin and to a frame on
// the Reader app's origin, and report what each frame received. Chromium
// delivers the handle to the same-origin frame and fires messageerror in the
// cross-origin one. That result is the reason the Reader lends a port.

async function probe(origin, holder) {
  if (!navigator.storage?.getDirectory) return { arrived: "no origin private file system here" };
  const dir = await navigator.storage.getDirectory();
  const handle = await dir.getFileHandle("probe.txt", { create: true });
  const w = await handle.createWritable(); await w.write("hello from " + location.origin); await w.close();
  const frame = document.createElement("iframe");
  frame.title = "File handle probe on " + origin;
  const answer = new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ arrived: "nothing after 4 s" }), 4000);
    addEventListener("message", function listener(event) {
      if (event.source !== frame.contentWindow || event.origin !== origin) return;
      if (event.data?.filesProbe === "ready") { frame.contentWindow.postMessage({ probe: true, handle }, origin); return; }
      clearTimeout(timer);
      removeEventListener("message", listener);
      resolve(event.data.filesProbe);
    });
  });
  frame.src = origin + "/files-probe.html";
  holder.append(frame);
  return answer;
}

const describe = (r) => r.arrived === "file" ? `arrived as a handle; the frame read "${r.text}"` : r.arrived === "messageerror" ? "messageerror: the frame could not rebuild the handle" : r.arrived;

export async function run(el, sites) {
  el.insertAdjacentHTML("beforeend", `<h3>A file handle posted to another origin</h3>
    <p class="small">Run now in your browser: a handle from this origin's private file system, posted to a frame on this origin and to one on the Reader's origin.</p>
    <ul class="checks" id="handoff-probe"><li><span class="jack"></span>To a frame on this origin: <span data-r="same">checking</span></li><li><span class="jack"></span>To a frame on the Reader's origin: <span data-r="cross">checking</span></li></ul>
    <div aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none" id="probe-frames"></div>`);
  const list = el.querySelector("#handoff-probe"), frames = el.querySelector("#probe-frames");
  const show = (key, r, good) => {
    const span = list.querySelector(`[data-r="${key}"]`);
    span.textContent = describe(r);
    span.previousElementSibling?.classList?.toggle("on", good);
    span.parentElement.querySelector(".jack").classList.toggle("on", good);
  };
  const same = await probe(location.origin, frames);
  show("same", same, same.arrived === "file");
  const cross = await probe(sites.reader, frames);
  show("cross", cross, false);
  list.dataset.done = JSON.stringify({ same: same.arrived, cross: cross.arrived });
}
