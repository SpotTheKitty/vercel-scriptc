// fs.watchFile / fs.unwatchFile: stat polling at the given interval. The
// listener receives (current, previous) Stats whenever a poll sees a
// difference; the first poll only records the baseline. A missing file
// polls as all-zero Stats: the first poll reports one change with both
// sides zeroed, and the creation reports previous.size 0 and previous.mtimeMs 0. Two watchFile calls on one path share one poller;
// unwatchFile(path, listener) removes one listener, unwatchFile(path)
// removes the rest, and once no listener is left the poller stops and
// the process can exit.
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dir = fs.mkdtempSync(join(tmpdir(), "scr-watchfile-"));
const existing = join(dir, "existing.txt");
const later = join(dir, "later.txt");
fs.writeFileSync(existing, "a");

let firstCalls = 0;
const first = (current: fs.Stats, previous: fs.Stats): void => {
  firstCalls++;
  if (firstCalls === 1) console.log("existing grew", previous.size, "->", current.size);
};
const second = (current: fs.Stats, previous: fs.Stats): void => {
  console.log("second listener", previous.size, "->", current.size, current.isFile());
  fs.unwatchFile(existing, first);
  fs.unwatchFile(existing);
  startMissingPhase();
};
fs.watchFile(existing, { interval: 20 }, first);
fs.watchFile(existing, { interval: 1000 }, second);
setTimeout(() => fs.writeFileSync(existing, "abcd"), 150);

function startMissingPhase(): void {
  let events = 0;
  const listener = (current: fs.Stats, previous: fs.Stats): void => {
    events++;
    if (events === 1) {
      // The first poll fails (ENOENT): one change with both sides zeroed.
      console.log("missing", previous.size, previous.mtimeMs, previous.isFile(), current.size, current.isFile());
      setTimeout(() => fs.writeFileSync(later, "hello"), 100);
      return;
    }
    console.log("created", previous.size, previous.mtimeMs, "->", current.size, current.isFile());
    fs.unwatchFile(later, listener);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("unwatched");
  };
  fs.watchFile(later, { interval: 20, persistent: true }, listener);
}
