package com.parchlock.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.util.Log;

import androidx.annotation.RequiresApi;

import java.util.Collections;

/**
 * D215: rotates the ParchLock icon through the four approved storybook scenes.
 *
 * Default (safe): the launcher icon never changes. With the player's consent
 * ParchLock pins ONE home-screen shortcut of its own and updates that
 * shortcut's picture in place each time the player leaves, so it is never
 * removed or moved.
 *
 * Experimental (opt-in, warned): the launcher entry itself is switched between
 * four activity-aliases. Some launchers remove or move home-screen copies when
 * that happens, which is why it is off by default.
 *
 * Every change happens from onStop, never while the app is in the foreground.
 */
final class IconRotator {

    // "archive" is the default artwork of the base launcher icon (icon pack).
    static final String[] SCENES = { "archive", "map", "dungeon", "forest" };
    static final String SHORTCUT_ID = "parchlock-rotating";
    static final String BASE_ALIAS = "com.parchlock.app.MainActivity";
    static final String TARGET = "com.parchlock.app.ParchLockActivity";
    private static final String PREFS = "parchlock_icon";
    private static final String TAG = "ParchLockIcon";

    private IconRotator() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static int sceneIndex(Context c) {
        int i = prefs(c).getInt("scene", 0);
        return i >= 0 && i < SCENES.length ? i : 0;
    }

    static String aliasFor(String id) {
        return "com.parchlock.app.Icon" + Character.toUpperCase(id.charAt(0)) + id.substring(1);
    }

    /** The scene a launch came from, or null when it carries none (base icon, recents). */
    static String sceneOfLaunch(Intent intent) {
        if (intent == null) return null;
        ComponentName comp = intent.getComponent();
        String cls = comp != null ? comp.getClassName() : "";
        for (String id : SCENES) if (aliasFor(id).equals(cls)) return id;
        String extra = intent.getStringExtra("scene");
        for (String id : SCENES) if (id.equals(extra)) return id;
        return null;
    }

    static boolean experimental(Context c) {
        SharedPreferences p = prefs(c);
        String pending = p.getString("experimentalPending", null);
        return pending != null ? "on".equals(pending) : p.getBoolean("experimental", false);
    }

    /** Recorded now, applied at the next onStop (component changes never in the foreground). */
    static void requestExperimental(Context c, boolean on) {
        prefs(c).edit().putString("experimentalPending", on ? "on" : "off").apply();
    }

    static boolean canPin(Context c) {
        if (Build.VERSION.SDK_INT < 26) return false;
        ShortcutManager sm = c.getSystemService(ShortcutManager.class);
        return sm != null && sm.isRequestPinShortcutSupported();
    }

    /** Ownership comes from the system's own list of this app's pinned shortcuts. */
    static boolean pinnedExists(Context c) {
        if (Build.VERSION.SDK_INT < 26) return false;
        ShortcutManager sm = c.getSystemService(ShortcutManager.class);
        if (sm == null) return false;
        for (ShortcutInfo s : sm.getPinnedShortcuts()) {
            if (SHORTCUT_ID.equals(s.getId()) && s.isEnabled()) return true;
        }
        return false;
    }

    /** Shows Android's own "add to home screen" confirmation; true only if it was shown. */
    static boolean requestPin(ParchLockActivity activity) {
        if (!canPin(activity)) return false;
        try {
            ShortcutManager sm = activity.getSystemService(ShortcutManager.class);
            activity.noteAppUi();
            return Build.VERSION.SDK_INT >= 26 && sm.requestPinShortcut(build(activity, SCENES[sceneIndex(activity)]), null);
        } catch (Exception e) {
            Log.w(TAG, "pin request failed", e);
            return false;
        }
    }

    static void onLeave(Context c) {
        try {
            SharedPreferences p = prefs(c);
            // A requested switch is recorded as applied only after the component
            // change succeeded; on failure the request stays pending for next time.
            String pending = p.getString("experimentalPending", null);
            boolean exp = pending != null ? "on".equals(pending) : p.getBoolean("experimental", false);
            if (pending != null && !exp) {
                restoreBase(c);   // throws before the commit below if it fails
                p.edit().putBoolean("experimental", false).remove("experimentalPending").apply();
            }
            boolean pinned = pinnedExists(c);
            if (!pinned && !exp) return;
            int next = (sceneIndex(c) + 1) % SCENES.length;
            // A refused update (rate limit) keeps the current scene everywhere.
            if (pinned && Build.VERSION.SDK_INT >= 26 && !updatePinned(c, SCENES[next])) return;
            if (exp) switchAlias(c, SCENES[next]);   // throws before the commit if it fails
            SharedPreferences.Editor done = p.edit().putInt("scene", next);
            if (exp && pending != null) done.putBoolean("experimental", true).remove("experimentalPending");
            done.apply();
        } catch (Exception e) {
            Log.w(TAG, "rotation skipped", e);
        }
    }

    @RequiresApi(26)
    private static boolean updatePinned(Context c, String id) {
        ShortcutManager sm = c.getSystemService(ShortcutManager.class);
        return sm != null && sm.updateShortcuts(Collections.singletonList(build(c, id)));
    }

    @RequiresApi(26)
    private static ShortcutInfo build(Context c, String id) {
        Intent intent = new Intent(Intent.ACTION_MAIN)
            .setClassName(c.getPackageName(), TARGET)
            .putExtra("scene", id);
        return new ShortcutInfo.Builder(c, SHORTCUT_ID)
            .setShortLabel("ParchLock")
            .setIcon(adaptiveIcon(c, id))
            .setIntent(intent)
            .build();
    }

    // The foreground layer keeps the artwork inside the adaptive safe zone;
    // composed over the dark ground it is a full adaptive bitmap.
    @RequiresApi(26)
    private static Icon adaptiveIcon(Context c, String id) {
        int res = c.getResources().getIdentifier("ic_launcher_" + id + "_foreground", "mipmap", c.getPackageName());
        Bitmap fg = BitmapFactory.decodeResource(c.getResources(), res);
        Bitmap out = Bitmap.createBitmap(fg.getWidth(), fg.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        canvas.drawColor(c.getColor(R.color.ic_launcher_background));
        canvas.drawBitmap(fg, 0, 0, null);
        return Icon.createWithAdaptiveBitmap(out);
    }

    private static void setEnabled(PackageManager pm, Context c, String cls, boolean on) {
        pm.setComponentEnabledSetting(new ComponentName(c, cls),
            on ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP);
    }

    // Enable the next entry BEFORE disabling the others, so a launcher entry always exists.
    private static void switchAlias(Context c, String id) {
        PackageManager pm = c.getPackageManager();
        setEnabled(pm, c, aliasFor(id), true);
        setEnabled(pm, c, BASE_ALIAS, false);
        for (String other : SCENES) if (!other.equals(id)) setEnabled(pm, c, aliasFor(other), false);
    }

    private static void restoreBase(Context c) {
        PackageManager pm = c.getPackageManager();
        setEnabled(pm, c, BASE_ALIAS, true);
        for (String id : SCENES) setEnabled(pm, c, aliasFor(id), false);
    }
}
