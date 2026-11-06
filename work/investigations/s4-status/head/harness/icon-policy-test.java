// Issue 1 (APK 64 closed on focus loss): the icon timing rules, on a plain JVM (claude).
//   javac -d %TEMP%\icon-policy android\app\src\main\java\com\parchlock\app\IconPolicy.java harness\icon-policy-test.java
//   java -cp %TEMP%\icon-policy com.parchlock.app.IconPolicyTest
package com.parchlock.app;

class IconPolicyTest {
    static int pass, fail;
    static void check(boolean ok, String msg) { if (ok) pass++; else fail++; System.out.println((ok ? "PASS: " : "FAIL: ") + msg); }

    public static void main(String[] args) {
        // One launch per new Activity.
        check(IconPolicy.countsAsLaunch(false), "a new Activity is a launch");
        check(!IconPolicy.countsAsLaunch(true), "a recreation from saved state is not a launch");

        // The native first-launch question.
        check(IconPolicy.promptDue(false, true), "first launch on a launcher that can pin: asked");
        check(!IconPolicy.promptDue(true, true), "already answered: never asked again");
        check(!IconPolicy.promptDue(false, false), "a launcher that cannot pin is never asked");

        // Scene cycle.
        check(IconPolicy.next(0) == 1 && IconPolicy.next(3) == 0, "scenes cycle archive, map, dungeon, forest");
        check(IconPolicy.next(-2) == 1 && IconPolicy.next(9) == 1, "a corrupt stored scene restarts the cycle");

        // Truthful "Add icon" result.
        check("unsupported".equals(IconPolicy.pinOutcome(false, false, false)), "no pin support: unsupported");
        check("updated".equals(IconPolicy.pinOutcome(true, true, true)), "an owned pin replaced in place: updated");
        check("requested".equals(IconPolicy.pinOutcome(true, false, true)), "Android's confirmation shown: requested");
        check("refused".equals(IconPolicy.pinOutcome(true, true, false)) && "refused".equals(IconPolicy.pinOutcome(true, false, false)), "a refusal is reported, never claimed as success");

        System.out.println(pass + " PASS / " + fail + " FAIL");
        System.exit(fail == 0 ? 0 : 1);
    }
}
