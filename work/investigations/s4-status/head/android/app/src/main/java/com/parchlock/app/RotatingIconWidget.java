package com.parchlock.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

/** Launcher-owned placement; updates never remove or reposition a widget. */
public class RotatingIconWidget extends AppWidgetProvider {
    static int[] ids(Context c) {
        return AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c, RotatingIconWidget.class));
    }
    @androidx.annotation.ChecksSdkIntAtLeast(api = 26)
    static boolean canPin(Context c) {
        return Build.VERSION.SDK_INT >= 26 && AppWidgetManager.getInstance(c).isRequestPinAppWidgetSupported();
    }
    static boolean exists(Context c) { return ids(c).length > 0; }
    static void render(Context c, int[] ids, int scene) {
        String name = IconRotator.SCENES[scene];
        int resource = c.getResources().getIdentifier("widget_" + name, "drawable", c.getPackageName());
        if (resource == 0) throw new IllegalStateException("Missing widget artwork: " + name);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(c.getPackageName(), R.layout.rotating_icon_widget);
            views.setImageViewResource(R.id.rotating_icon_picture, resource);
            Intent open = new Intent(c, ParchLockActivity.class).setAction(Intent.ACTION_MAIN)
                .putExtra("scene", name);
            views.setOnClickPendingIntent(R.id.rotating_icon_picture, PendingIntent.getActivity(c, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            AppWidgetManager.getInstance(c).updateAppWidget(id, views);
        }
        if (ids.length > 0) IconRotator.retireOwnedPin(c);
    }
    static String pinOrUpdate(Context c) {
        int[] existing = ids(c);
        if (existing.length > 0) { render(c, existing, IconRotator.sceneIndex(c)); return "updated"; }
        if (!canPin(c)) return "unsupported";
        Intent launch = new Intent(c, ParchLockActivity.class).setAction(Intent.ACTION_MAIN)
            .putExtra("scene", IconRotator.SCENES[IconRotator.sceneIndex(c)]);
        PendingIntent placed = PendingIntent.getActivity(c, 0x504c, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return AppWidgetManager.getInstance(c).requestPinAppWidget(new ComponentName(c, RotatingIconWidget.class), null, placed)
            ? "requested" : "refused";
    }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        render(c, ids, IconRotator.sceneIndex(c));
    }
}

