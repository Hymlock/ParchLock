package com.parchlock.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // D129: must be registered BEFORE super.onCreate(), which is where the
        // bridge is built and the plugin registry is frozen. Registering after
        // it silently yields a plugin the WebView can never see.
        registerPlugin(SaveFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
