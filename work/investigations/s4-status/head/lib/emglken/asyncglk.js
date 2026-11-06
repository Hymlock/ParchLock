// asyncglk/src/blorb/blorb.ts
import { unescape } from "lodash-es";

// asyncglk/src/common/misc.ts
var utf8decoder = new TextDecoder();
var utf8encoder = new TextEncoder();

// asyncglk/src/common/constants.ts
var DEFAULT_METRICS = {
  buffercharheight: 1,
  buffercharwidth: 1,
  buffermarginx: 0,
  buffermarginy: 0,
  graphicsmarginx: 0,
  graphicsmarginy: 0,
  gridcharheight: 1,
  gridcharwidth: 1,
  gridmarginx: 0,
  gridmarginy: 0,
  height: 50,
  inspacingx: 0,
  inspacingy: 0,
  outspacingx: 0,
  outspacingy: 0,
  width: 80
};
var PACKAGE_VERSION = "0.1.0";

// asyncglk/src/dialog/common/common.ts
function filetype_to_extension(filetype) {
  switch (filetype) {
    case "command":
    case "transcript":
      return ".txt";
    case "save":
      return ".glksave";
    default:
      return ".glkdata";
  }
}

// asyncglk/src/glkapi/glkapi.ts
import { cloneDeep as cloneDeep2 } from "lodash-es";

// asyncglk/src/dialog/common/cache.ts
import { debounce } from "lodash-es";

// asyncglk/src/glkapi/windows.ts
import { cloneDeep } from "lodash-es";

// asyncglk/src/glkote/common/glkote.ts
var GlkOteBase = class {
  classname = "GlkOte";
  version = PACKAGE_VERSION;
  accept_func = () => {
  };
  autorestoring = false;
  Blorb;
  current_metrics = Object.assign({}, DEFAULT_METRICS);
  Dialog;
  disabled = false;
  generation = 0;
  is_inited = false;
  options = {};
  timer = null;
  waiting_for_update = false;
  async init(options) {
    if (!options) {
      return this.error("no options provided");
    }
    if (!options.accept) {
      return this.error("an accept function was not given to GlkOte");
    }
    this.options = options;
    this.accept_func = options.accept;
    if (options.Blorb) {
      this.Blorb = options.Blorb;
    }
    if (options.Dialog) {
      this.Dialog = options.Dialog;
    }
    this.is_inited = true;
    this.send_event({ type: "init" });
  }
  error(error) {
    throw typeof error === "string" ? new Error(error) : error;
  }
  extevent(value) {
    this.send_event({
      type: "external",
      value
    });
  }
  getdomcontext() {
    throw new Error("getdomcontext is not applicable to this GlkOte library");
  }
  getdomid(name) {
    throw new Error("getdomid is not applicable to this GlkOte library");
  }
  getinterface() {
    return this.options;
  }
  getlibrary(name) {
    switch (name) {
      case "Blorb":
        return this.Blorb;
      case "Dialog":
        return this.Dialog;
      default:
        return null;
    }
  }
  inited() {
    return this.is_inited;
  }
  log(msg) {
    console.log(msg);
  }
  setdomcontext(val) {
    throw new Error("setdomcontext is not applicable to this GlkOte library");
  }
  update(data) {
    try {
      this.autorestoring = false;
      this.waiting_for_update = false;
      if (data.type === "error") {
        return this.error(data.message);
      }
      if (data.type === "pass") {
        return;
      }
      if (data.type === "retry") {
        setTimeout(() => this.send_event({ type: "refresh" }), 2e3);
        return;
      }
      if (data.type !== "update") {
        return this.error(`Unknown update type: ${data.type}`);
      }
      if (data.gen === this.generation) {
        this.log(`Ignoring repeated generation number: ${data.gen}`);
        return;
      }
      this.generation = data.gen;
      if (this.disabled) {
        this.disable(false);
      }
      if (data.input) {
        this.cancel_inputs(data.input);
      }
      if (data.windows) {
        this.update_windows(data.windows);
      }
      if (data.content) {
        this.update_content(data.content);
      }
      if (data.input) {
        this.update_inputs(data.input);
      }
      if (data.schannels && this.Blorb) {
        this.update_schannels(data.schannels);
      }
      if (data.timer !== void 0) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        if (data.timer) {
          this.timer = setInterval(() => this.ontimer(), data.timer);
        }
      }
      if (data.specialinput) {
        this.handle_specialinput(data.specialinput);
      }
      this.disabled = false;
      if (data.disable || data.specialinput) {
        this.disable(true);
      }
      if (data.autorestore) {
        this.autorestoring = true;
        this.autorestore(data.autorestore);
      }
      if (typeof data.page_margin_bg !== "undefined" && this.options.set_body_to_page_bg) {
        this.set_page_bg(data.page_margin_bg);
      }
      if (data.disable) {
        this.exit();
      }
    } catch (err) {
      this.error(err);
    }
  }
  warning(msg) {
    console.warn(msg);
  }
  // AsyncGlk specific implementation methods
  autorestore(data) {
  }
  capabilities() {
    return ["timer"];
  }
  exit() {
  }
  handle_specialinput(data) {
    if (data.type === "fileref_prompt") {
      const replyfunc = (ref) => this.send_event({
        type: "specialresponse",
        response: "fileref_prompt",
        value: ref
      });
      try {
        if (!this.Dialog) {
          setTimeout(() => replyfunc(null), 0);
        } else {
          if (this.Dialog.async) {
            this.Dialog.prompt(filetype_to_extension(data.filetype), data.filemode !== "read").then((filename) => {
              replyfunc(filename ? { filename } : null);
            });
          } else {
            this.Dialog.open(data.filemode !== "read", data.filetype, data.gameid, replyfunc);
          }
        }
      } catch (ex) {
        this.log(`Unable to open file dialog: ${ex}`);
        setTimeout(() => replyfunc(null), 0);
      }
    } else {
      this.error(`Request for unknown special input type: ${data.type}`);
    }
  }
  ontimer() {
    if (!this.disabled && this.timer) {
      this.send_event({ type: "timer" });
    }
  }
  save_allstate() {
  }
  send_event(ev) {
    if (this.disabled && ev.type !== "specialresponse") {
      return;
    }
    if (this.waiting_for_update) {
      console.log("Trying to send event when waiting for input", ev);
      return;
    }
    this.waiting_for_update = true;
    ev.gen = this.generation;
    switch (ev.type) {
      case "arrange":
        ev.metrics = this.current_metrics;
        break;
      case "init":
        ev.metrics = this.current_metrics;
        ev.support = this.capabilities();
        break;
      case "specialresponse":
        ev.response = "fileref_prompt";
        break;
    }
    this.accept_func(ev);
  }
  set_page_bg(colour) {
  }
  update_schannels(windows) {
  }
};

// asyncglk/src/dialog/node/async.ts
import fs from "fs";
import fs_async from "fs/promises";
import "mute-stream";
import os from "os";
import path from "path";

// asyncglk/src/glkote/cheap/stdio.ts
import MuteStream from "mute-stream";
import readline from "readline";
var instance;
function get_stdio() {
  if (instance) {
    return instance;
  }
  const stdin = process.stdin;
  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  const stdout = new MuteStream();
  stdout.pipe(process.stdout);
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    prompt: ""
  });
  readline.emitKeypressEvents(stdin);
  instance = {
    rl,
    stdin,
    stdout
  };
  return instance;
}

// asyncglk/src/dialog/node/async.ts
var CheapAsyncDialog = class {
  "async" = true;
  rl;
  stdout;
  constructor() {
    const cheap_stdio = get_stdio();
    this.rl = cheap_stdio.rl;
    this.stdout = cheap_stdio.stdout;
  }
  async init(_options) {
  }
  async delete(path2) {
    try {
      fs.unlinkSync(path_posix_to_native(path2));
    } catch {
    }
  }
  async exists(path2) {
    try {
      await fs_async.access(path_posix_to_native(path2), fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  get_dirs() {
    const cwd = path_native_to_posix(process.cwd());
    return {
      storyfile: cwd,
      system_cwd: cwd,
      temp: path_native_to_posix(os.tmpdir()),
      working: cwd
    };
  }
  prompt(extension, _save) {
    this.stdout.write("\n");
    return new Promise((resolve) => {
      this.rl.question("Please enter a file name (without an extension): ", (path2) => {
        resolve(path2 ? `${path2}${extension}` : null);
      });
    });
  }
  read(path2) {
    return fs_async.readFile(path_posix_to_native(path2)).catch(() => null);
  }
  set_storyfile_dir(path2) {
    return {
      storyfile: path2,
      working: path2
    };
  }
  async write(files) {
    for (const [path2, data] of Object.entries(files)) {
      fs.writeFileSync(path_posix_to_native(path2), data, { flush: true });
    }
  }
};
function path_native_to_posix(native_path) {
  if (process.platform === "win32") {
    let new_path = native_path.replaceAll(path.sep, path.posix.sep);
    if (/^\w:/.test(new_path)) {
      new_path = path.posix.sep + new_path;
    }
    return new_path;
  } else {
    return native_path;
  }
}
function path_posix_to_native(posix_path) {
  if (process.platform === "win32") {
    let new_path = posix_path.replaceAll(path.posix.sep, path.sep);
    if (new_path.startsWith("\\")) {
      new_path = new_path.substring(1);
    }
    return new_path;
  } else {
    return posix_path;
  }
}

// asyncglk/src/dialog/node/cheap.ts
import "mute-stream";

// asyncglk/src/glkote/cheap/cheap.ts
import "mute-stream";
var isTerminalApp = process.env.TERM_PROGRAM === "Apple_Terminal";
var ESC = "\x1B[";
var cursorRestorePosition = isTerminalApp ? "\x1B8" : ESC + "u";
var cursorSavePosition = isTerminalApp ? "\x1B7" : ESC + "s";
var eraseEndLine = ESC + "K";
var scrollDown = ESC + "T";
var KEY_REPLACEMENTS = {
  "\x7F": "delete",
  "	": "tab"
};
var CheapGlkOte = class extends GlkOteBase {
  current_input_type = null;
  handle_char_input_callback = (str, key) => this.handle_char_input(str, key);
  handle_line_input_callback = (line) => this.handle_line_input(line);
  rl;
  stdin;
  stdout;
  window = null;
  constructor() {
    super();
    const cheap_stdio = get_stdio();
    this.rl = cheap_stdio.rl;
    this.stdin = cheap_stdio.stdin;
    this.stdout = cheap_stdio.stdout;
  }
  async init(options) {
    if (!options) {
      throw new Error("no options provided");
    }
    if (options.Glk) {
      const old_glk_window_open = options.Glk.glk_window_open.bind(options.Glk);
      options.Glk.glk_window_open = function(splitwin, method, size, wintype, rock) {
        if (splitwin) {
          return null;
        }
        return old_glk_window_open(splitwin, method, size, wintype, rock);
      };
    }
    this.rl.resume();
    if (process.stdout.isTTY) {
      this.current_metrics.height = process.stdout.rows;
      this.current_metrics.width = process.stdout.columns;
    }
    super.init(options);
  }
  attach_handlers() {
    if (this.current_input_type === "char") {
      this.stdout.mute();
      this.stdin.on("keypress", this.handle_char_input_callback);
    }
    if (this.current_input_type === "line") {
      this.rl.on("line", this.handle_line_input_callback);
    }
  }
  cancel_inputs(windows) {
    if (windows.length === 0) {
      this.current_input_type = null;
      this.detach_handlers();
    }
  }
  detach_handlers() {
    this.stdin.removeListener("keypress", this.handle_char_input_callback);
    this.rl.removeListener("line", this.handle_line_input_callback);
    this.stdout.unmute();
  }
  disable(disable) {
    this.disabled = disable;
    if (disable) {
      this.detach_handlers();
    } else {
      this.attach_handlers();
    }
  }
  exit() {
    this.detach_handlers();
    this.rl.close();
    this.stdout.write("\n");
    super.exit();
  }
  handle_char_input(str, key) {
    if (this.current_input_type === "char") {
      this.current_input_type = null;
      this.detach_handlers();
      this.rl._line_buffer = null;
      this.rl.line = "";
      const res = KEY_REPLACEMENTS[str] || str || key.name.replace(/f(\d+)/, "func$1");
      this.send_event({
        type: "char",
        window: this.window.id,
        value: res
      });
    }
  }
  handle_line_input(line) {
    if (this.current_input_type === "line") {
      if (this.stdout.isTTY) {
        this.stdout.write(scrollDown + cursorRestorePosition + eraseEndLine);
      }
      this.current_input_type = null;
      this.detach_handlers();
      this.send_event({
        type: "line",
        window: this.window.id,
        value: line
      });
    }
  }
  save_allstate() {
    throw new Error("save_allstate not yet implemented");
  }
  update_content(content) {
    const window_content = content.filter((content2) => content2.id === this.window.id)[0];
    for (const line of window_content?.text || []) {
      if (!line.append) {
        this.stdout.write("\n");
      }
      const content2 = line.content;
      if (content2) {
        for (let i = 0; i < content2.length; i++) {
          const run = content2[i];
          if (typeof run === "string") {
            i++;
            this.stdout.write(content2[i]);
          } else if ("text" in run) {
            this.stdout.write(run.text);
          }
        }
      }
    }
  }
  update_inputs(windows) {
    if (windows.length) {
      if (windows[0].type === "char") {
        this.current_input_type = "char";
      }
      if (windows[0].type === "line") {
        if (this.stdout.isTTY) {
          this.stdout.write(cursorSavePosition);
        }
        this.current_input_type = "line";
      }
      this.attach_handlers();
    }
  }
  update_windows(windows) {
    for (const win of windows) {
      if (win.type === "buffer") {
        this.window = win;
      }
    }
  }
};

// asyncglk/src/glkote/remglk/remglk.ts
var RemGlk = class extends GlkOteBase {
  stdin;
  stdout;
  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.stdin.pause();
    if (this.stdin.isTTY) {
      this.stdin.setRawMode(true);
    }
  }
  async init(options) {
    if (!options) {
      throw new Error("no options provided");
    }
    if (!options.accept) {
      throw new Error("an accept function was not given to GlkOte");
    }
    this.options = options;
    this.accept_func = options.accept;
    let buffer = "";
    this.stdin.on("data", (chunk) => {
      buffer += chunk.toString().trim();
      if (buffer.endsWith("}")) {
        let event;
        try {
          event = JSON.parse(buffer);
        } catch {
        }
        if (event) {
          buffer = "";
          if (event.type === "init") {
            event.metrics = Object.assign({}, DEFAULT_METRICS, event.metrics);
          }
          if (event.type === "specialresponse" && typeof event.value === "string") {
            event.value = { filename: event.value };
          }
          this.accept_func(event);
        }
      }
    });
    this.stdin.resume();
    this.is_inited = true;
  }
  log(_msg) {
  }
  update(data) {
    this.stdout.write(`${JSON.stringify(data)}

`);
    if (data.type === "update" && data.disable) {
      process.exit();
    }
  }
  cancel_inputs(windows) {
    throw new Error("cancel_inputs method should not be called in RemGlk mode");
  }
  disable(disable) {
    throw new Error("disable method should not be called in RemGlk mode");
  }
  handle_specialinput(data) {
    throw new Error("handle_specialinput method should not be called in RemGlk mode");
  }
  save_allstate() {
    throw new Error("save_allstate method should not be called in RemGlk mode");
  }
  update_content(content) {
    throw new Error("update_content method should not be called in RemGlk mode");
  }
  update_inputs(windows) {
    throw new Error("update_inputs method should not be called in RemGlk mode");
  }
  update_windows(windows) {
    throw new Error("update_windows method should not be called in RemGlk mode");
  }
};
export {
  CheapAsyncDialog,
  CheapGlkOte,
  RemGlk,
  path_native_to_posix
};
