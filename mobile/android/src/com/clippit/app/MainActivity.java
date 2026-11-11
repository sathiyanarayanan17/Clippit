package com.clippit.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/**
 * Clippit for Android.
 *
 * A thin native shell around the same web app. It adds three things a web page cannot do:
 *  1. receive a message shared from any app (Share -> Clippit),
 *  2. appear in the text-selection menu ("Check with Clippit"),
 *  3. read warnings aloud with the phone's own speech engine (Hindi, Tamil, ...).
 *
 * The app has NO internet permission. All pages are served from the APK's own assets,
 * so nothing a user checks can leave the phone.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.clippit.local";
    private static final String HOME = "https://" + HOST + "/index.html";

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.addJavascriptInterface(new Bridge(), "ClippitNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!HOST.equals(u.getHost())) {
                    return null;
                }
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) {
                    path = "/index.html";
                }
                try {
                    InputStream in = getAssets().open(path.substring(1));
                    return new WebResourceResponse(mimeFor(path), "UTF-8", in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", null,
                            new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) {
                    return false; // our own pages stay in the app
                }
                // Anything else (dialer, cybercrime portal, WhatsApp) opens in the right app.
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                Intent i = new Intent(scheme.equals("tel") ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, u);
                try {
                    startActivity(i);
                } catch (ActivityNotFoundException ignored) {
                    // no app can open it: do nothing
                }
                return true;
            }
        });

        loadFor(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadFor(intent);
    }

    /** Opens the app, or the checker with a shared / selected message already filled in. */
    private void loadFor(Intent intent) {
        String text = null;
        if (intent != null) {
            String action = intent.getAction();
            if (Intent.ACTION_SEND.equals(action)) {
                CharSequence t = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                if (t != null) text = t.toString();
            } else if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
                CharSequence t = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
                if (t != null) text = t.toString();
            }
        }
        if (text != null && text.length() > 5000) {
            text = text.substring(0, 5000); // keep the address short and the check fast
        }
        web.loadUrl(text == null ? HOME : HOME + "?text=" + Uri.encode(text));
    }

    private static String mimeFor(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    /** Functions the web page can call. */
    private class Bridge {
        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        /**
         * Reads text aloud. Returns "ok", or "nolang" if the phone has no voice for that language
         * (the page then tells the user honestly).
         */
        @JavascriptInterface
        public String speak(final String text, final String languageTag) {
            final String[] result = {"ok"};
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tts == null) {
                        tts = new TextToSpeech(MainActivity.this, new TextToSpeech.OnInitListener() {
                            @Override
                            public void onInit(int status) {
                                ttsReady = status == TextToSpeech.SUCCESS;
                                if (ttsReady) say(text, languageTag);
                            }
                        });
                    } else if (ttsReady) {
                        result[0] = say(text, languageTag);
                    }
                }
            });
            return result[0];
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tts != null) tts.stop();
                }
            });
        }
    }

    private String say(String text, String languageTag) {
        Locale loc = Locale.forLanguageTag(languageTag);
        int r = tts.setLanguage(loc);
        boolean missing = r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED;
        tts.setSpeechRate(0.9f);
        if (Build.VERSION.SDK_INT >= 21) {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "clippit");
        } else {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null);
        }
        return missing ? "nolang" : "ok";
    }
}
