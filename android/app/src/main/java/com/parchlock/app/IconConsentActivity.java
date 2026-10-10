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
            .setTitle("A rotating home-screen widget")
            .setMessage("Add a ParchLock storybook widget? Its picture changes each time you start ParchLock. Android will ask where to place it, then tap the widget to start.\n\nTo resize it, touch and hold the widget and drag its handles.\n\nYou may remove your old shortcut if you already placed one.")
            .setPositiveButton("Add widget", (d, w) -> answer(true))
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
            if ("requested".equals(outcome)) { finish(); return; }
            if ("unsupported".equals(outcome)) Toast.makeText(this, "Add ParchLock from your launcher's widget list.", Toast.LENGTH_LONG).show();
            if ("updated".equals(outcome)) Toast.makeText(this, "Home-screen widget updated.", Toast.LENGTH_SHORT).show();
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
