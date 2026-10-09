package com.parchlock.app;

/**
 * D215 issue 1 (APK 64 app closure): the pure timing rules of the icon
 * rotation, kept free of Android types so they can be tested on a plain JVM
 * (harness/icon-policy-test.java). IconRotator and ParchLockActivity apply them.
 *
 * Contract agreed with codex (#2257): no icon work on any non-finishing stop;
 * one launch per new Activity; the pinned icon advances at launch and the
 * stored scene moves only after the update succeeded; the experimental launcher
 * switch only on a real (finishing) exit.
 */
final class IconPolicy {

    static final int SCENE_COUNT = 4;

    private IconPolicy() {}

    /** A new Activity is a launch; a recreation from saved state never is. */
    static boolean countsAsLaunch(boolean hasSavedState) {
        return !hasSavedState;
    }

    /** The native home-screen question: once, and only where Android can pin. */
    static boolean promptDue(boolean asked, boolean canPin) {
        return !asked && canPin;
    }

    static int next(int stored) {
        int s = stored >= 0 && stored < SCENE_COUNT ? stored : 0;
        return (s + 1) % SCENE_COUNT;
    }

    /** Home, lock, app switch and our own pickers never do icon work. */
    static boolean iconWorkOnStop(boolean finishing, boolean changingConfigurations) {
        return finishing && !changingConfigurations;
    }

    /**
     * The launcher alias to show after a real exit, or -1 for none. With a
     * pinned icon it matches the pinned picture (already advanced at launch);
     * without one it advances itself.
     */
    static int exitAliasScene(boolean experimental, boolean pinned, int stored) {
        if (!experimental) return -1;
        int s = stored >= 0 && stored < SCENE_COUNT ? stored : 0;
        return pinned ? s : next(s);
    }

    /** The true result of "Add icon" for Options and the first-launch question. */
    static String pinOutcome(boolean canPin, boolean pinned, boolean ok) {
        if (!canPin) return "unsupported";
        if (!ok) return "refused";
        return pinned ? "updated" : "requested";
    }
}
