"""Compile the actual Activity against isolated lifecycle doubles; no device proof.

The BridgeActivity double follows installed Capacitor's load-inside-onCreate and
null-bridge lifecycle ordering. This checks Activity integration, not just policy.
Run from the repo root: python harness/audit-icon-activity.py
"""
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
scratch = root / "tmp/codex-icon-activity"
scratch.mkdir(parents=True, exist_ok=True)
sources = {
"android/content/Intent.java": '''package android.content; public class Intent { public Intent(){} public Intent(Object c,Class<?> k){} public String scene; public Intent putExtra(String k,String v){scene=v;return this;} public String getStringExtra(String k){return scene;} }''',
"android/os/Bundle.java": '''package android.os; public class Bundle extends java.util.HashMap<String,Object> {
 public String getString(String k){return (String)get(k);} public void putString(String k,String v){put(k,v);}
 public boolean getBoolean(String k){return Boolean.TRUE.equals(get(k));}
 public boolean getBoolean(String k,boolean d){return containsKey(k)?getBoolean(k):d;}
 public void putBoolean(String k,boolean v){put(k,v);} }''',
"android/widget/Toast.java": '''package android.widget; public class Toast {
 public static final int LENGTH_SHORT=0,LENGTH_LONG=1;
 public static Toast makeText(Object c,String s,int n){return new Toast();} public void show(){} }''',
"android/view/View.java": '''package android.view; public class View {
 private final java.util.List<Runnable> queue=new java.util.ArrayList<>();
 public boolean post(Runnable r){queue.add(r);return true;} public boolean removeCallbacks(Runnable r){return queue.remove(r);}
 public void drain(){java.util.List<Runnable> run=new java.util.ArrayList<>(queue);queue.clear();for(Runnable r:run)r.run();} }''',
"android/view/Window.java": '''package android.view; public class Window {
 private final View view=new View();public View getDecorView(){return view;} }''',
"androidx/appcompat/app/AlertDialog.java": '''package androidx.appcompat.app; public class AlertDialog {
 public static AlertDialog last; private java.util.function.BiConsumer<AlertDialog,Integer> yes,no;
 private java.util.function.Consumer<AlertDialog> cancel;
 public void show(){last=this;} public void dismiss(){} public void setCanceledOnTouchOutside(boolean b){}
 public void choose(boolean b){(b?yes:no).accept(this,0);dismiss();} public void cancel(){cancel.accept(this);dismiss();}
 public static class Builder {
  private final AlertDialog d=new AlertDialog(); public Builder(Object c){}
  public Builder setTitle(String s){return this;} public Builder setMessage(String s){return this;}
  public Builder setPositiveButton(String s,java.util.function.BiConsumer<AlertDialog,Integer> l){d.yes=l;return this;}
  public Builder setNegativeButton(String s,java.util.function.BiConsumer<AlertDialog,Integer> l){d.no=l;return this;}
  public Builder setOnCancelListener(java.util.function.Consumer<AlertDialog> l){d.cancel=l;return this;}
  public AlertDialog create(){return d;}
 } }''',
"androidx/appcompat/app/AppCompatActivity.java": """package androidx.appcompat.app; public class AppCompatActivity {
 public boolean finishing,destroyed; public int redirected; public android.content.Intent next;
 public void onCreate(android.os.Bundle b){} public void onDestroy(){destroyed=true;}
 public boolean isFinishing(){return finishing;} public boolean isDestroyed(){return destroyed;}
 public void finish(){finishing=true;} public void startActivity(android.content.Intent i){redirected++;next=i;}
 public android.content.Intent getIntent(){return new android.content.Intent().putExtra("scene","forest");}
 }""",
"com/getcapacitor/Bridge.java": '''package com.getcapacitor; public class Bridge {
 public int starts,resumes;public final App app=new App();
 public void onStart(){starts++;} public void onResume(){resumes++;} public App getApp(){return app;}
 public static class App {public int active;public void fireStatusChange(boolean b){if(b)active++;}} }''',
"com/getcapacitor/BridgeActivity.java": '''package com.getcapacitor;
 public class BridgeActivity {
 protected Bridge bridge; protected int activityDepth; private android.content.Intent intent=new android.content.Intent();
 public boolean finishing,destroyed,changing;private final android.view.Window window=new android.view.Window();
 public void registerPlugin(Class<?> c){} public void onCreate(android.os.Bundle b){load();}
 protected boolean lifecycleStarted; public int redirected; public void startActivity(android.content.Intent i){redirected++;} public void finish(){finishing=true;}
 protected void load(){if(lifecycleStarted)throw new IllegalStateException("registration after STARTED");bridge=new Bridge();onNewIntent(intent);}
 protected void onNewIntent(android.content.Intent i){} public android.content.Intent getIntent(){return intent;}
 public void setIntent(android.content.Intent i){intent=i;} public void onSaveInstanceState(android.os.Bundle b){}
 public void onStart(){lifecycleStarted=true;activityDepth++;if(bridge!=null)bridge.onStart();}
 public void onResume(){if(bridge!=null){bridge.getApp().fireStatusChange(true);bridge.onResume();}}
 public void onPause(){} public void onStop(){if(bridge!=null)activityDepth=Math.max(0,activityDepth-1);}
 public void onDestroy(){destroyed=true;} public boolean isFinishing(){return finishing;}
 public boolean isDestroyed(){return destroyed;} public boolean isChangingConfigurations(){return changing;}
 public android.view.Window getWindow(){return window;}
 }''',
"com/parchlock/app/SaveFilePlugin.java": '''package com.parchlock.app; public class SaveFilePlugin {}''',
"com/parchlock/app/IconRotator.java": '''package com.parchlock.app; class IconRotator {
 static int rotations,exits;static boolean can=true;static String outcome="updated";static final Prefs pref=new Prefs();
 static Prefs prefs(Object c){return pref;} static boolean canPin(Object c){return can;}
 static String sceneOfLaunch(android.content.Intent i){return "archive";} static String pinOrUpdate(Object c){return outcome;}
 static void rotateAtLaunch(Object c){rotations++;} static void onRealExit(Object c){exits++;}
 static class Prefs {boolean asked;boolean getBoolean(String k,boolean d){return asked;}
  Prefs edit(){return this;} Prefs putBoolean(String k,boolean b){asked=b;return this;}void apply(){} }
 }''',
"com/parchlock/app/ActivityAudit.java": '''package com.parchlock.app;
 import android.os.Bundle; import androidx.appcompat.app.AlertDialog;
 public class ActivityAudit {
 static int pass;static void check(boolean b,String s){if(!b)throw new AssertionError(s);pass++;System.out.println("PASS: "+s);}
 static void reset(boolean asked){IconRotator.rotations=0;IconRotator.exits=0;IconRotator.pref.asked=asked;AlertDialog.last=null;}
 static class A extends ParchLockActivity {
  com.getcapacitor.Bridge observed(){return bridge;} int depth(){return activityDepth;}
  void drain(){getWindow().getDecorView().drain();} }
 public static void main(String[] args){
  reset(false);A a=new A();a.onCreate(null);
  check(a.observed()==null&&a.redirected==1&&a.finishing,"first consent redirects without constructing Bridge");
  reset(true);A ready=new A();ready.onCreate(null);ready.onStart();ready.onResume();ready.drain();
  check(ready.observed().starts==1&&ready.observed().resumes==1,"Bridge registers before STARTED and gets lifecycle once");
  reset(true);A home=new A();home.onCreate(null);home.onStart();home.onResume();home.onPause();home.onStop();home.drain();
  check(IconRotator.rotations==0,"queued launch does not update while backgrounded");
  home.onStart();home.onResume();home.drain();check(IconRotator.rotations==1,"pending launch advances once when foreground returns");
  home.onPause();home.onStop();home.onStart();home.onResume();home.drain();check(IconRotator.rotations==1,"pending launch is consumed exactly once");
  home.finishing=true;home.onPause();home.onStop();check(IconRotator.exits==0,"real finishing exit performs no icon work");

  reset(true);A dead=new A();dead.onCreate(null);dead.onStart();dead.onResume();dead.onDestroy();dead.drain();
  check(IconRotator.rotations==0,"destroyed Activity cannot run queued rotation");
  reset(true);Bundle saved=new Bundle();saved.putString("parchlock.launchScene","forest");A restored=new A();restored.onCreate(saved);restored.onStart();restored.onResume();restored.drain();
  check(IconRotator.rotations==0&&"forest".equals(restored.launchScene()),"saved-state recreation preserves tapped scene without advance");

  reset(false);IconConsentActivity gate=new IconConsentActivity();gate.onCreate(null);AlertDialog.last.choose(true);
  check(IconRotator.pref.asked&&gate.redirected==1&&gate.finishing&&"forest".equals(gate.next.scene),"Add records consent and forwards scene to a new game Activity");
  reset(false);IconRotator.outcome="requested";IconConsentActivity requested=new IconConsentActivity();requested.onCreate(null);AlertDialog.last.choose(true);
  check(IconRotator.pref.asked&&requested.redirected==0&&requested.finishing,"placement request closes consent without opening game early");IconRotator.outcome="updated";
  reset(false);IconConsentActivity no=new IconConsentActivity();no.onCreate(null);AlertDialog.last.cancel();
  check(IconRotator.pref.asked&&no.redirected==1,"Back means Not now and proceeds once");
  reset(false);IconConsentActivity gone=new IconConsentActivity();gone.onCreate(null);AlertDialog stale=AlertDialog.last;gone.onDestroy();stale.choose(true);
  check(!IconRotator.pref.asked&&gone.redirected==0,"destroyed consent cannot record answer or launch game");
  System.out.println(pass+" Activity integration checks PASS (isolated doubles; not device proof)");
 } }''',
}
for relative, content in sources.items():
    target = scratch / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
jdk = Path(os.environ["JAVA_HOME"]) / "bin"
native = root / "android/app/src/main/java/com/parchlock/app"
command = [str(jdk / "javac.exe"), "-d", str(scratch / "classes")]
command += [str(scratch / p) for p in sources]
command += [str(native / name) for name in ["ParchLockActivity.java", "IconConsentActivity.java", "IconPolicy.java"]]
subprocess.run(command, check=True)
subprocess.run([str(jdk / "java.exe"), "-cp", str(scratch / "classes"), "com.parchlock.app.ActivityAudit"], check=True)
