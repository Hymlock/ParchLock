package com.parchlock.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.BridgeActivity;

/**
 * D215: the app's single real activity. It is never enabled or disabled, so
 * every intent and the rotating home-screen shortcut can always reach it. The
 * public launcher name com.parchlock.app.MainActivity is now an activity-alias
 * targeting this class (AndroidManifest.xml), so home-screen icons placed by
 * earlier versions keep working.
 *
 * Issue 1 (APK 64 closed when it lost focus): no icon work happens when the
 * app is merely left. The home-screen question is asked natively before the
 * WebView is built; the pinned icon advances once per launch; the experimental
 * launcher switch runs only on a real exit (IconPolicy).
 */
public class ParchLockActivity extends BridgeActivity {

    private static final String LAUNCH_SCENE = "parchlock.launchScene";

    // The scene of the icon that started this Activity; survives recreation
    // so the splash never falls back to the already advanced preference.
    private String launchScene;
    private boolean countsAsLaunch;
    private boolean started;
    private boolean resumed;
    private AlertDialog prompt;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        boolean restored = savedInstanceState != null;
        launchScene = restored ? savedInstanceState.getString(LAUNCH_SCENE) : IconRotator.sceneOfLaunch(getIntent());
        countsAsLaunch = IconPolicy.countsAsLaunch(restored);
        // D129: must be registered BEFORE super.onCreate(), which is where the
        // bridge is built and the plugin registry is frozen. Registering after
        // it silently yields a plugin the WebView can never see.
        registerPlugin(SaveFilePlugin.class);
        super.onCreate(savedInstanceState);
    }

    String launchScene() {
        return launchScene;
    }

    // BridgeActivity.onCreate calls this to build the Bridge and the WebView.
    // On first launch the home-screen question comes first, before anything else.
    @Override
    protected void load() {
        boolean asked = IconRotator.prefs(this).getBoolean("promptAsked", false);
        if (IconPolicy.promptDue(asked, IconRotator.canPin(this))) showPrompt();
        else finishLoad();
    }

    private void showPrompt() {
        prompt = new AlertDialog.Builder(this)
            .setTitle("A home-screen icon that changes")
            .setMessage("Add a ParchLock icon to your home screen? Its picture changes to a different story scene each time you open ParchLock.\n\nIf you already have a ParchLock icon on your home screen, you can remove the old one.")
            .setPositiveButton("Add icon", (d, w) -> answer(true))
            .setNegativeButton("Not now", (d, w) -> answer(false))
            .setOnCancelListener(d -> answer(false))
            .create();
        prompt.setCanceledOnTouchOutside(false);
        prompt.show();
    }

    private void answer(boolean add) {
        prompt = null;
        if (isFinishing() || isDestroyed() || bridge != null) return;
        IconRotator.prefs(this).edit().putBoolean("promptAsked", true).apply();
        if (add) {
            String outcome = IconRotator.pinOrUpdate(this);
            if ("updated".equals(outcome)) Toast.makeText(this, "Home-screen icon updated.", Toast.LENGTH_SHORT).show();
            else if ("refused".equals(outcome)) Toast.makeText(this, "Android didn't allow the icon right now. You can add it later in Options.", Toast.LENGTH_LONG).show();
        }
        finishLoad();
    }

    private void finishLoad() {
        super.load();
        if (bridge == null) return;
        // Loaded late (after the question): hand the bridge the lifecycle it
        // missed, exactly once. activityDepth was already counted by onStart.
        if (started) bridge.onStart();
        if (resumed) {
            bridge.getApp().fireStatusChange(true);
            bridge.onResume();
        }
        queueLaunchUpdate();
    }

    // The launch's pinned-icon update runs only while this Activity is live and
    // in front. If the player leaves first it stays pending until the next
    // onResume; it runs at most once per launch (codex #2258).
    private void queueLaunchUpdate() {
        if (countsAsLaunch && resumed) getWindow().getDecorView().post(this::runLaunchUpdate);
    }

    private void runLaunchUpdate() {
        if (!countsAsLaunch || bridge == null || !resumed || isFinishing() || isDestroyed()) return;
        countsAsLaunch = false;
        IconRotator.rotateAtLaunch(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask: a later intent only brings this Activity forward. It is
        // not a launch and does not change launchScene.
        setIntent(intent);
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putString(LAUNCH_SCENE, launchScene);
    }

    @Override
    public void onStart() {
        super.onStart();
        started = true;
    }

    @Override
    public void onResume() {
        super.onResume();
        resumed = true;
        if (bridge != null) queueLaunchUpdate();
    }

    @Override
    public void onPause() {
        resumed = false;
        super.onPause();
    }

    @Override
    public void onStop() {
        // BridgeActivity counts every onStart but only uncounts a stop once the
        // bridge exists; balance a stop during the question here.
        if (bridge == null) activityDepth = Math.max(0, activityDepth - 1);
        super.onStop();
        started = false;
        if (IconPolicy.iconWorkOnStop(isFinishing(), isChangingConfigurations())) IconRotator.onRealExit(this);
    }

    @Override
    public void onDestroy() {
        // Dismissing is not an answer: a recreated Activity asks again.
        if (prompt != null) {
            prompt.dismiss();
            prompt = null;
        }
        super.onDestroy();
    }
}
