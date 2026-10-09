package com.parchlock.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

/** Native consent only: no WebView or plugin registry exists in this Activity. */
public class IconConsentActivity extends AppCompatActivity {
    private AlertDialog prompt;
    private boolean answered;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prompt = new AlertDialog.Builder(this)
            .setTitle("A home-screen icon that changes")
            .setMessage("Add a ParchLock icon to your home screen? Its picture changes to a different story scene each time you open ParchLock.\n\nIf you already have a ParchLock icon on your home screen, you can remove the old one.")
            .setPositiveButton("Add icon", (d, w) -> answer(true))
            .setNegativeButton("Not now", (d, w) -> answer(false))
            .setOnCancelListener(d -> answer(false)).create();
        prompt.setCanceledOnTouchOutside(false);
        prompt.show();
    }

    private void answer(boolean add) {
        if (answered || isFinishing() || isDestroyed()) return;
        answered = true;
        IconRotator.prefs(this).edit().putBoolean("promptAsked", true).apply();
        if (add) {
            String outcome = IconRotator.pinOrUpdate(this);
            if ("updated".equals(outcome)) Toast.makeText(this, "Home-screen icon updated.", Toast.LENGTH_SHORT).show();
            else if ("refused".equals(outcome)) Toast.makeText(this, "Android didn't allow the icon right now. You can add it later in Options.", Toast.LENGTH_LONG).show();
        }
        startActivity(new Intent(this, ParchLockActivity.class).putExtra("scene", getIntent().getStringExtra("scene")));
        finish();
    }

    @Override public void onDestroy() {
        if (prompt != null) { prompt.dismiss(); prompt = null; }
        super.onDestroy();
    }
}
