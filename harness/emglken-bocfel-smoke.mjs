import {CheapAsyncDialog, CheapGlkOte, path_native_to_posix} from '../vendor/emglken-stage/node_modules/emglken/build/asyncglk.js'
import Bocfel from '../vendor/emglken-stage/node_modules/emglken/build/bocfel.js'
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const story = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'harness', 'fixtures', 'lost.z5')
if (!fs.existsSync(story)) {
  console.error('missing story', story)
  process.exit(1)
}

const Dialog = new CheapAsyncDialog()
const GlkOte = new CheapGlkOte()
await Dialog.init({GlkOte})
const updates = []
const orig = GlkOte.update.bind(GlkOte)
GlkOte.update = (msg) => {
  updates.push(msg && msg.type)
  return orig(msg)
}

const vm = await Bocfel()
const timer = setTimeout(() => {
  const ok = updates.length > 0
  console.log(JSON.stringify({ story, updates: updates.length, ok }))
  console.log(ok ? 'PASS: emglken bocfel glk updates' : 'FAIL: no updates')
  process.exit(ok ? 0 : 2)
}, 3500)

process.on('unhandledRejection', error => {
  if (error && error.name === 'ExitStatus') {
    clearTimeout(timer)
    console.log('PASS: bocfel ExitStatus', updates.length)
    process.exit(0)
  }
})

vm.start({ arguments: [path_native_to_posix(story)], Dialog, GlkOte })