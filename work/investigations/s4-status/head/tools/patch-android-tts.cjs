// D211: preserve the installed plugin owner; repair cancelled PluginCalls.
// Invoked before its JavaCompile by android/build.gradle. Unknown source fails
// the build rather than silently compiling an unsafe or partially patched copy.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ORIGINAL_SHA = 'd9b02b290c312ea7307988776876293f09a502334c3ebd8d3245b4e44f4faf61';
const PATCHED_SHA = '1c802633be6cf820c1782cc1ee85e0a85d4c0655a04bcc4179ed7af7be6fcb4a';
const hash = s => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
function patchSource(source) {
 let s = source.replace(/\r\n/g, '\n');
 if (hash(s) !== ORIGINAL_SHA) throw Error('TTS source changed: review the cancellation repair before building');
 const replace = (from,to) => { if (s.split(from).length !== 2) throw Error('TTS patch anchor missing or duplicated'); s=s.replace(from,to); };
 replace('import java.util.HashMap;', 'import java.util.concurrent.ConcurrentHashMap;');
 replace('new HashMap()', 'new ConcurrentHashMap<>()');
 replace(`                        SpeakResultCallback callback = requests.get(utteranceId);
                        if (callback != null) {
                            callback.onDone();
                            requests.remove(utteranceId);
                        }`, '                        finishRequest(utteranceId, true);');
 replace(`                        SpeakResultCallback callback = requests.get(utteranceId);
                        if (callback != null) {
                            callback.onError();
                            requests.remove(utteranceId);
                        }`, '                        finishRequest(utteranceId, false);');
 replace('                    @Override\n                    public void onRangeStart', `                    @Override
                    public void onStop(String utteranceId, boolean interrupted) {
                        finishRequest(utteranceId, false);
                    }

                    @Override
                    public void onRangeStart`);
 replace('        if (queueStrategy != android.speech.tts.TextToSpeech.QUEUE_ADD) {', `        if (tts == null) {
            resultCallback.onError();
            return;
        }
        if (queueStrategy != android.speech.tts.TextToSpeech.QUEUE_ADD) {`);
 replace('        requests.put(callbackId, resultCallback);', '        requests.put(callbackId, resultCallback);\n        try {');
 replace('        tts.speak(text, queueStrategy, ttsParams, callbackId);', `        if (tts.speak(text, queueStrategy, ttsParams, callbackId) < 0) {
            finishRequest(callbackId, false);
        }
        } catch (RuntimeException failure) {
            finishRequest(callbackId, false);
        }`);
 replace(`    public void stop() {
        tts.stop();
        requests.clear();
    }`, `    // Binder and plugin threads compete only through atomic remove. A late
    // onDone/onError/onStop cannot settle an already cancelled call again.
    private void finishRequest(String utteranceId, boolean completed) {
        SpeakResultCallback callback = requests.remove(utteranceId);
        if (callback != null) {
            if (completed) callback.onDone();
            else callback.onError();
        }
    }

    public void stop() {
        ArrayList<String> pending = new ArrayList<>(requests.keySet());
        try {
            if (tts != null) tts.stop();
        } finally {
            for (String utteranceId : pending) finishRequest(utteranceId, false);
        }
    }`);
 replace('        tts.stop();\n        tts.shutdown();', '        try { stop(); } finally { tts.shutdown(); }');
 return s;
}
function repair(root,preview=false) {
 const base=path.join(root,'node_modules/@capacitor-community/text-to-speech');
 if (JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8')).version !== '8.0.2') throw Error('Unsupported TTS version: cancellation patch requires reviewed 8.0.2 source');
 const target=path.join(base,'android/src/main/java/com/getcapacitor/community/tts/TextToSpeech.java');
 const current=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
 if (hash(current)===PATCHED_SHA) return console.log('TTS cancellation repair verified');
 const next=patchSource(current), nextHash=hash(next);
 if(preview) return console.log(nextHash);
 if(nextHash!==PATCHED_SHA) throw Error('TTS repaired source checksum mismatch');
 const tmp=target+'.parchlock-repair.tmp';
 fs.writeFileSync(tmp,next,'utf8');
 fs.renameSync(tmp,target);
 if(hash(fs.readFileSync(target,'utf8'))!==PATCHED_SHA) throw Error('TTS repaired source write did not verify');
 console.log('TTS cancellation repair applied and verified');
}
module.exports={patchSource,hash,ORIGINAL_SHA,PATCHED_SHA};
if(require.main===module){try{repair(path.resolve(__dirname,'..'),process.argv.includes('--preview'));}catch(e){console.error(e.message);process.exitCode=1;}}
