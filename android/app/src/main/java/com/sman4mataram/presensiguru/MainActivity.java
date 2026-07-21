package com.sman4mataram.presensiguru;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String WEB_URL = "https://fakhrul212.github.io/absensiguru2026/";
    private static final int PERMISSION_REQUEST_CODE = 100;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String cameraPhotoPath;
    private PermissionRequest mPermissionRequest;

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                        String dataString = result.getData().getDataString();
                        if (dataString != null) {
                            results = new Uri[] { Uri.parse(dataString) };
                        }
                    } else if (result.getResultCode() == Activity.RESULT_OK && cameraPhotoPath != null) {
                        results = new Uri[] { Uri.parse(cameraPhotoPath) };
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);

        // Request permissions first, then setup WebView
        checkAndRequestPermissions();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setDatabaseEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);

        // Enable mixed content for camera access
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    view.loadUrl(url);
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            // Handle camera/microphone permission requests from WebView
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                mPermissionRequest = request;

                // Check if camera permission is granted
                if (ContextCompat.checkSelfPermission(MainActivity.this,
                        Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    // Grant all requested resources
                    request.grant(request.getResources());
                } else {
                    // Request camera permission
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[] { Manifest.permission.CAMERA },
                            PERMISSION_REQUEST_CODE + 1);
                }
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                super.onPermissionRequestCanceled(request);
                mPermissionRequest = null;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
                    File photoFile = null;
                    try {
                        photoFile = createImageFile();
                    } catch (IOException ex) {
                        Toast.makeText(MainActivity.this, "Error creating image file", Toast.LENGTH_SHORT).show();
                    }

                    if (photoFile != null) {
                        cameraPhotoPath = "file:" + photoFile.getAbsolutePath();
                        Uri photoUri = FileProvider.getUriForFile(MainActivity.this,
                                getPackageName() + ".fileprovider", photoFile);
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
                    }
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("image/*");

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Pilih Gambar");
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { takePictureIntent });

                fileChooserLauncher.launch(chooserIntent);
                return true;
            }
        });

        webView.loadUrl(WEB_URL);
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        } else {
            // All permissions granted, setup WebView
            setupWebView();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            // Initial permission request - setup webview regardless
            setupWebView();

            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "Izin " + getPermissionName(permissions[i]) + " diperlukan",
                            Toast.LENGTH_SHORT).show();
                }
            }
        } else if (requestCode == PERMISSION_REQUEST_CODE + 1) {
            // WebView camera permission request
            if (mPermissionRequest != null) {
                if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    mPermissionRequest.grant(mPermissionRequest.getResources());
                } else {
                    mPermissionRequest.deny();
                    Toast.makeText(this, "Izin kamera diperlukan untuk scan QR", Toast.LENGTH_LONG).show();
                }
                mPermissionRequest = null;
            }
        }
    }

    private String getPermissionName(String permission) {
        if (permission.equals(Manifest.permission.CAMERA))
            return "Kamera";
        if (permission.equals(Manifest.permission.ACCESS_FINE_LOCATION))
            return "Lokasi";
        if (permission.equals(Manifest.permission.ACCESS_COARSE_LOCATION))
            return "Lokasi";
        return permission;
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
