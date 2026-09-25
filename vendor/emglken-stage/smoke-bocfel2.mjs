import {CheapAsyncDialog, CheapGlkOte, path_native_to_posix} from './node_modules/emglken/build/asyncglk.js'
import Bocfel from './node_modules/emglken/build/bocfel.js'
import fs from 'fs'
import path from 'path'

const story = path.resolve(process.argv[2])
console.log('exists', fs.existsSync(story), 'size', fs.statSync(story).size)
console.log('posix', path_native_to_posix(story))

const Dialog = new CheapAsyncDialog()
const GlkOte = new CheapGlkOte()
await Dialog.init({GlkOte})

// Monkeypatch GlkOte.update to capture first text buffer
const updates = []
const orig = GlkOte.update.bind(GlkOte)
GlkOte.update = (msg) => {
  updates.push(msg && msg.type)
  try {
    const s = JSON.stringify(msg)
    if (s.includes('Lost') || s.includes('Grunk') || s.includes('pig') || s.toLowerCase().includes('west')) {
      console.log('GLK_HIT', s.slice(0, 300))
    }
  } catch {}
  return orig(msg)
}

process.on('unhandledRejection', error => {
  if (error.name === 'ExitStatus') {
    console.log('ExitStatus', error.message)
    console.log('updates', updates.slice(0, 10))
    process.exit(0)
  }
  console.error('rejection', error)
  process.exit(1)
})

const vm = await Bocfel()
setTimeout(() => {
  console.log('timeout updates', updates)
  console.log(updates.length ? 'PASS: bocfel produced glk updates' : 'FAIL: no glk updates')
  process.exit(updates.length ? 0 : 2)
}, 4000)

vm.start({
  arguments: [path_native_to_posix(story)],
  Dialog,
  GlkOte,
})