package com.parchlock.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

/**
 * D129 (operator-reported): "Download" opened the SHARE sheet instead of a
 * file picker, so there was no way to simply save a file into the phone's own
 * Downloads folder the way you would on a computer.
 *
 * The safety mechanism behind that is scoped storage. Since Android 10 (API
 * 29) an app cannot write into shared storage by path, and at targetSdk 36
 * there is no opt-out left: @capacitor/filesystem's Directory.Documents maps
 * to Environment.getExternalStoragePublicDirectory(...) and writes through
 * raw java.io.File, which the platform refuses. MANAGE_EXTERNAL_STORAGE would
 * technically bypass it but is a Play-policy-restricted permission meant for
 * file managers and backup tools, and is not remotely justifiable for saving a
 * transcript. D114's cache-dir + share-sheet route was the correct workaround
 * for "get this file off the device", but it is the wrong verb for "save this
 * file onto the device".
 *
 * The sanctioned API for that is the Storage Access Framework:
 * ACTION_CREATE_DOCUMENT shows the system's real file picker ("Save to..."),
 * the player chooses Downloads or any folder they like, and the app writes to
 * the returned content:// URI. It needs NO permission at all on any API level,
 * because the user granting a location IS the permission. That is exactly the
 * desktop "Save As" behaviour the operator asked for.
 */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("data");
        if (filename == null || data == null) {
            call.reject("saveFile needs both a filename and data.");
            return;
        }

        // The picker filters by type; a wrong/unknown type makes some file
        // managers hide every folder, so fall back to a permissive default.
        String mimeType = call.getString("mimeType");
        if (mimeType == null || mimeType.length() == 0) {
            mimeType = "application/octet-stream";
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "createDocumentResult");
    }

    @ActivityCallback
    private void createDocumentResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        // Backing out of the picker is an ordinary thing to do, not a failure.
        // The JS side suppresses anything matching /cancel/i rather than
        // interrupting the player, so the wording here matters.
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("canceled");
            return;
        }

        Intent intent = result.getData();
        Uri uri = intent != null ? intent.getData() : null;
        if (uri == null) {
            call.reject("No save location was chosen.");
            return;
        }

        OutputStream out = null;
        OutputStreamWriter writer = null;
        try {
            // "wt" truncates: picking an existing file replaces it rather than
            // leaving a tail of the previous, longer contents behind.
            out = getContext().getContentResolver().openOutputStream(uri, "wt");
            if (out == null) {
                call.reject("That location could not be opened for writing.");
                return;
            }
            writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
            writer.write(call.getString("data", ""));
            writer.flush();

            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("The file could not be written: " + e.getMessage());
        } finally {
            try { if (writer != null) writer.close(); } catch (Exception ignored) {}
            try { if (out != null) out.close(); } catch (Exception ignored) {}
        }
    }

    // ---- D215 icon rotation (IconRotator) -----------------------------------

    /** The scene of the icon that launched the app, plus what this device supports. */
    @PluginMethod
    public void iconScene(PluginCall call) {
        JSObject r = new JSObject();
        // Fixed for the life of the Activity (issue 1): the tapped icon, not a later intent.
        String scene = getActivity() instanceof ParchLockActivity ? ((ParchLockActivity) getActivity()).launchScene() : null;
        r.put("scene", scene);
        r.put("canPin", IconRotator.canPin(getContext()));
        r.put("pinned", IconRotator.pinnedExists(getContext()));
        call.resolve(r);
    }

    /**
     * "Add icon": updates ParchLock's own pinned icon in place, or asks Android
     * to pin one. Resolves the true outcome: updated, requested, refused or unsupported.
     */
    @PluginMethod
    public void pinRotatingShortcut(PluginCall call) {
        JSObject r = new JSObject();
        r.put("action", IconRotator.pinOrUpdate(getContext()));
        call.resolve(r);
    }

}
