package com.parchlock.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.os.Build;
import android.util.Log;


import java.util.Collections;

/** Rotates installed home-screen widgets once per genuine new app launch. */
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

    /** The scene a launch came from, or null when it carries none (base icon, recents). */
    static String sceneOfLaunch(Intent intent) {
        if (intent == null) return null;
        String extra = intent.getStringExtra("scene");
        for (String id : SCENES) if (id.equals(extra)) return id;
        return null;
    }

    static boolean canPin(Context c) {
        return RotatingIconWidget.canPin(c);
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

    static String pinOrUpdate(Context c) {
        try { return RotatingIconWidget.pinOrUpdate(c); }
        catch (Exception e) { Log.w(TAG, "widget request failed", e); return "refused"; }
    }

    /** Commit scene only after every installed widget has received its update. */
    static void rotateAtLaunch(Context c) {
        try {
            int[] widgets = RotatingIconWidget.ids(c);
            if (widgets.length == 0) return;
            int next = IconPolicy.next(sceneIndex(c));
            RotatingIconWidget.render(c, widgets, next);
            prefs(c).edit().putInt("scene", next).apply();
        } catch (Exception e) {
            Log.w(TAG, "launch rotation skipped", e);
        }
    }

    static void retireOwnedPin(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        ShortcutManager sm = c.getSystemService(ShortcutManager.class);
        if (sm != null && pinnedExists(c)) {
            sm.disableShortcuts(Collections.singletonList(SHORTCUT_ID), "Replaced by the ParchLock widget");
            sm.removeDynamicShortcuts(Collections.singletonList(SHORTCUT_ID));
        }
    }

    /** Repair the retained launcher entry after removing experimental aliases. */
    static void ensureBaseLauncher(Context c) {
        PackageManager pm = c.getPackageManager();
        ComponentName base = new ComponentName(c, BASE_ALIAS);
        if (pm.getComponentEnabledSetting(base) == PackageManager.COMPONENT_ENABLED_STATE_DISABLED) {
            pm.setComponentEnabledSetting(base, PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
        }
        prefs(c).edit().remove("experimental").remove("experimentalPending").apply();
    }
}
