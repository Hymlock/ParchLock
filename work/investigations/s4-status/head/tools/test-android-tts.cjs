// Focused test: compile and execute the exact repaired terminal methods.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert'),{spawnSync}=require('child_process');
const patch=require('./patch-android-tts.cjs');
const sourcePath=path.resolve(__dirname,'../node_modules/@capacitor-community/text-to-speech/android/src/main/java/com/getcapacitor/community/tts/TextToSpeech.java');
const installed=fs.readFileSync(sourcePath,'utf8');
const source=patch.hash(installed)===patch.PATCHED_SHA?installed:patch.patchSource(installed);
assert.equal(patch.hash(source),patch.PATCHED_SHA);
assert.throws(()=>patch.patchSource(installed+'\n// unexpected source'),/source changed/);
const terminal=source.slice(source.indexOf('    private void finishRequest('),source.indexOf('    public JSArray getSupportedLanguages'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'parchlock-tts-check-'));
const java=`import java.util.*;import java.util.concurrent.*;import java.util.concurrent.atomic.*;
public class TtsCheck {
 interface SpeakResultCallback {void onDone();void onError();}
 private Map<String,SpeakResultCallback> requests=new ConcurrentHashMap<>();
 private FakeEngine tts=new FakeEngine();
 static class FakeEngine {boolean fail;void stop(){if(fail)throw new RuntimeException("stop failure");}}
 ${terminal}
 static void check(boolean yes){if(!yes)throw new AssertionError();}
 public static void main(String[] args)throws Exception{
  TtsCheck t=new TtsCheck();AtomicInteger done=new AtomicInteger(),failed=new AtomicInteger();
  SpeakResultCallback cb=new SpeakResultCallback(){public void onDone(){done.incrementAndGet();}public void onError(){failed.incrementAndGet();}};
  t.requests.put("completed",cb);t.finishRequest("completed",true);t.finishRequest("completed",false);check(done.get()==1&&failed.get()==0);
  for(int i=0;i<1000;i++){t.requests.put("cancel"+i,cb);t.stop();t.finishRequest("cancel"+i,true);}check(failed.get()==1000&&t.requests.isEmpty());
  t.requests.put("race",cb);List<Thread> threads=new ArrayList<>();for(int i=0;i<20;i++){Thread x=new Thread(()->t.finishRequest("race",false));threads.add(x);x.start();}for(Thread x:threads)x.join();check(failed.get()==1001);
  t.requests.put("stop-error",cb);t.tts.fail=true;try{t.stop();}catch(RuntimeException expected){}check(t.requests.isEmpty()&&failed.get()==1002);
  t.tts=null;t.requests.put("null-engine",cb);t.stop();check(t.requests.isEmpty()&&failed.get()==1003);
  System.out.println("PASS native completion, cancellation, late events, concurrent settlement, failed stop and null engine");
 }
}`;
fs.writeFileSync(path.join(dir,'TtsCheck.java'),java);
for(const [cmd,args] of [['javac',['-d',dir,path.join(dir,'TtsCheck.java')]],['java',['-cp',dir,'TtsCheck']]]){const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.error);if(r.stdout)process.stdout.write(r.stdout);}
(async()=>{
 let calls=0;const sandbox={document:{readyState:'loading',addEventListener(){}},navigator:{webdriver:true},Global:{Prefs:{ReadAloud:true}},setTimeout:f=>{f();return 1},clearTimeout(){},console,window:{__PL_TEST_SPEECH:true,Capacitor:{Plugins:{TextToSpeech:{stop:()=>Promise.resolve(),speak:()=>{calls++;return Promise.reject(Error('cancelled'));}}}}}};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../js/ReadAloud.js'),'utf8'),sandbox);
 assert(sandbox.ReadAloud.speak('A short native utterance.'));
 await new Promise(r=>setImmediate(r));
 assert.equal(calls,1);assert.equal(sandbox.ReadAloud.ttsCounts.nativePending,0);assert.equal(sandbox.ReadAloud.ttsCounts.nativeFailed,1);
 console.log('PASS rejected native speak settles diagnostics without retries');
})().catch(e=>{console.error(e);process.exitCode=1});
