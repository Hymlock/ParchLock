package com.parchlock.app;

/**
 * D215 issue 1 (APK 64 app closure): the pure timing rules of the icon
 * rotation, kept free of Android types so they can be tested on a plain JVM
 * (harness/icon-policy-test.java). IconRotator and ParchLockActivity apply them.
 *
 * Contract agreed with codex (#2257): no icon work on any non-finishing stop;
 * one launch per new Activity; the pinned icon advances at launch and the
 * stored scene moves only after the update succeeded. Launcher aliases never rotate.
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

    /** The true result of "Add icon" for Options and the first-launch question. */
    static String pinOutcome(boolean canPin, boolean pinned, boolean ok) {
        if (!canPin) return "unsupported";
        if (!ok) return "refused";
        return pinned ? "updated" : "requested";
    }
}
