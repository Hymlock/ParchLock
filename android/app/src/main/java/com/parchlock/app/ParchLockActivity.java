package com.parchlock.app;

import android.content.Intent;
import android.os.Bundle;


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
 * WebView is built; the pinned icon advances once per launch; the base
 * launcher entry stays fixed.
 */
public class ParchLockActivity extends BridgeActivity {

    private static final String LAUNCH_SCENE = "parchlock.launchScene";

    // The scene of the icon that started this Activity; survives recreation
    // so the splash never falls back to the already advanced preference.
    private String launchScene;
    private boolean countsAsLaunch;
    private boolean resumed;

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

    // Plugins register ActivityResult callbacks while onCreate is still below
    // STARTED. Never construct a Bridge from a later dialog callback.
    @Override
    protected void load() {
        boolean asked = IconRotator.prefs(this).getBoolean("promptAsked", false);
        if (IconPolicy.promptDue(asked, IconRotator.canPin(this))) {
            startActivity(new Intent(this, IconConsentActivity.class).putExtra("scene", launchScene));
            finish();
            return;
        }
        super.load();
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

}
