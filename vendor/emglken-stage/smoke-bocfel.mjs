import {CheapAsyncDialog, CheapGlkOte} from './node_modules/emglken/build/asyncglk.js'
import Bocfel from './node_modules/emglken/build/bocfel.js'
import path from 'path'
import {fileURLToPath} from 'url'

const story = path.resolve('../../harness/fixtures/lost.z5')
const Dialog = new CheapAsyncDialog()
const GlkOte = new CheapGlkOte()
await Dialog.init({GlkOte})
const vm = await Bocfel()
let started = false
const timer = setTimeout(() => {
  console.log(JSON.stringify({ started, story, note: "bocfel-start-timeout-ok" }))
  console.log("PASS: bocfel engine instantiated and start invoked")
  process.exit(0)
}, 2500)
try {
  started = true
  vm.start({ arguments: [story.replace(/\\/g, '/')], Dialog, GlkOte })
} catch (e) {
  clearTimeout(timer)
  if (e && e.name === 'ExitStatus') {
    console.log("PASS: bocfel exit", e.message)
    process.exit(0)
  }
  console.error(e)
  process.exit(1)
}