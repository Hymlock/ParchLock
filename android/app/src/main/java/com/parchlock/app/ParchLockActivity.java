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
 */
public class ParchLockActivity extends BridgeActivity {

    // True while an activity this app launched (file picker, share sheet,
    // speech, the pin confirmation) is in front, so stepping out to it never
    // counts as the player leaving ParchLock.
    private boolean appUiPending = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // D129: must be registered BEFORE super.onCreate(), which is where the
        // bridge is built and the plugin registry is frozen. Registering after
        // it silently yields a plugin the WebView can never see.
        registerPlugin(SaveFilePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask: a later launch from another icon arrives here; keep it
        // current so iconScene() reports the icon that was actually tapped.
        setIntent(intent);
    }

    // ActivityResultRegistry (Capacitor's WebView file chooser and plugin
    // calls) and plain startActivity both funnel through these two methods.
    @Override
    public void startActivityForResult(Intent intent, int requestCode, Bundle options) {
        appUiPending = true;
        super.startActivityForResult(intent, requestCode, options);
    }

    @Override
    public void startActivity(Intent intent, Bundle options) {
        appUiPending = true;
        super.startActivity(intent, options);
    }

    void noteAppUi() {
        appUiPending = true;
    }

    @Override
    public void onResume() {
        super.onResume();
        appUiPending = false;
    }

    @Override
    public void onStop() {
        super.onStop();
        // Leaving (Home, another app, swipe away, screen lock) rotates the icon;
        // a configuration change or our own picker/share UI does not.
        if (!isChangingConfigurations() && !appUiPending) IconRotator.onLeave(this);
    }
}
