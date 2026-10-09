package com.parchlock.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restores the fixed launcher entry when the experimental build is replaced. */
public class LauncherRecoveryReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            IconRotator.ensureBaseLauncher(context);
        }
    }
}
