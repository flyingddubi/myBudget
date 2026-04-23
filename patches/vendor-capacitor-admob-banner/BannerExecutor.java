package com.getcapacitor.community.admob.banner;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.util.Supplier;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.community.admob.helpers.AdViewIdHelper;
import com.getcapacitor.community.admob.helpers.RequestHelper;
import com.getcapacitor.community.admob.models.AdMobPluginError;
import com.getcapacitor.community.admob.models.AdOptions;
import com.getcapacitor.community.admob.models.Executor;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;
import com.google.android.gms.common.util.BiConsumer;

public class BannerExecutor extends Executor {

    private static final int FALLBACK_NATIVE_WIDTH_DP = 320;
    private static final int FALLBACK_NATIVE_MIN_HEIGHT_DP = 108;

    private final JSObject emptyObject = new JSObject();
    private RelativeLayout mAdViewLayout;
    private NativeAdView mNativeAdView;
    private NativeAd mNativeAd;
    private ViewGroup mViewGroup;
    private boolean isLoadingAd = false;
    private String currentAdUnitId;

    public BannerExecutor(
        Supplier<Context> contextSupplier,
        Supplier<Activity> activitySupplier,
        BiConsumer<String, JSObject> notifyListenersFunction,
        String pluginLogTag
    ) {
        super(contextSupplier, activitySupplier, notifyListenersFunction, pluginLogTag, "BannerExecutor");
    }

    public void initialize() {
        mViewGroup = (ViewGroup) ((ViewGroup) activitySupplier.get().findViewById(android.R.id.content)).getChildAt(0);
    }

    public void showBanner(final PluginCall call) {
        final AdOptions adOptions = AdOptions.getFactory().createBannerOptions(call);

        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    try {
                        ensureContainer(call, adOptions);
                        mAdViewLayout.setVisibility(View.VISIBLE);
                        mViewGroup.bringChildToFront(mAdViewLayout);

                        if (mNativeAd != null && adOptions.adId.equals(currentAdUnitId)) {
                            emitCurrentSize();
                            call.resolve();
                            return;
                        }

                        if (isLoadingAd && adOptions.adId.equals(currentAdUnitId)) {
                            call.resolve();
                            return;
                        }

                        loadNativeAd(adOptions);
                        call.resolve();
                    } catch (Exception ex) {
                        call.reject(ex.getLocalizedMessage(), ex);
                    }
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void hideBanner(final PluginCall call) {
        if (mAdViewLayout == null) {
            call.reject("You tried to hide a banner that was never shown");
            return;
        }

        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    if (mAdViewLayout != null) {
                        mAdViewLayout.setVisibility(View.GONE);
                        notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), new BannerAdSizeInfo(0, 0));
                    }
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void resumeBanner(final PluginCall call) {
        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    if (mAdViewLayout != null) {
                        mAdViewLayout.setVisibility(View.VISIBLE);
                        emitCurrentSize();
                        Log.d(logTag, "Native AD Resumed");
                    }
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void removeBanner(final PluginCall call) {
        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    destroyCurrentAd();

                    if (mAdViewLayout != null && mAdViewLayout.getParent() == mViewGroup) {
                        mViewGroup.removeView(mAdViewLayout);
                    }

                    mAdViewLayout = null;
                    isLoadingAd = false;
                    currentAdUnitId = null;

                    notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), new BannerAdSizeInfo(0, 0));
                    Log.d(logTag, "Native AD Removed");
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    private void ensureContainer(PluginCall call, AdOptions adOptions) {
        if (mAdViewLayout == null) {
            mAdViewLayout = new RelativeLayout(contextSupplier.get());
            mAdViewLayout.setClipChildren(false);
            mAdViewLayout.setClipToPadding(false);
            mAdViewLayout.setHorizontalGravity(Gravity.CENTER_HORIZONTAL);
            mAdViewLayout.setVerticalGravity(Gravity.CENTER_VERTICAL);
        }

        final CoordinatorLayout.LayoutParams layoutParams = buildContainerLayoutParams(call, adOptions);
        mAdViewLayout.setLayoutParams(layoutParams);

        final int contentHeightPx = pxFromCss(call.getInt("contentHeight", FALLBACK_NATIVE_MIN_HEIGHT_DP));
        mAdViewLayout.setMinimumHeight(contentHeightPx);

        if (mAdViewLayout.getParent() == null) {
            mViewGroup.addView(mAdViewLayout);
        }
    }

    private CoordinatorLayout.LayoutParams buildContainerLayoutParams(PluginCall call, AdOptions adOptions) {
        final int offsetTopPx = pxFromCss(adOptions.margin);
        final int offsetLeftPx = pxFromCss(call.getInt("offsetX", 0));
        final int contentWidthPx = pxFromCss(call.getInt("contentWidth", 0));
        final int minWidthPx = pxFromCss(FALLBACK_NATIVE_WIDTH_DP);

        final int layoutWidth = contentWidthPx > 0 ? contentWidthPx : minWidthPx;
        final CoordinatorLayout.LayoutParams layoutParams = new CoordinatorLayout.LayoutParams(
            layoutWidth,
            CoordinatorLayout.LayoutParams.WRAP_CONTENT
        );

        if ("CENTER".equals(adOptions.position)) {
            layoutParams.gravity = Gravity.CENTER;
            return layoutParams;
        }

        if ("BOTTOM_CENTER".equals(adOptions.position)) {
            layoutParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
            layoutParams.setMargins(0, 0, 0, offsetTopPx);
            return layoutParams;
        }

        layoutParams.gravity = Gravity.TOP | Gravity.START;
        layoutParams.setMargins(offsetLeftPx, offsetTopPx, 0, 0);
        return layoutParams;
    }

    private void loadNativeAd(AdOptions adOptions) {
        final AdRequest adRequest = RequestHelper.createRequest(adOptions);
        final String finalId = AdViewIdHelper.getFinalAdId(adOptions, adRequest, logTag, contextSupplier.get());

        destroyCurrentAd();

        isLoadingAd = true;
        currentAdUnitId = adOptions.adId;

        Log.d(logTag, "Native ad ID: " + finalId);

        new AdLoader.Builder(contextSupplier.get(), finalId)
            .forNativeAd(nativeAd ->
                activitySupplier
                    .get()
                    .runOnUiThread(() -> {
                        isLoadingAd = false;

                        if (mAdViewLayout == null) {
                            nativeAd.destroy();
                            return;
                        }

                        mNativeAd = nativeAd;
                        mNativeAdView = createNativeAdView(nativeAd);

                        mAdViewLayout.removeAllViews();
                        RelativeLayout.LayoutParams nativeLayoutParams = new RelativeLayout.LayoutParams(
                            RelativeLayout.LayoutParams.MATCH_PARENT,
                            RelativeLayout.LayoutParams.WRAP_CONTENT
                        );
                        nativeLayoutParams.addRule(RelativeLayout.CENTER_HORIZONTAL);
                        mAdViewLayout.addView(mNativeAdView, nativeLayoutParams);
                        mAdViewLayout.setVisibility(View.VISIBLE);
                        mViewGroup.bringChildToFront(mAdViewLayout);

                        mAdViewLayout.post(this::emitCurrentSize);
                        notifyListeners(BannerAdPluginEvents.Loaded.getWebEventName(), emptyObject);
                    })
            )
            .withAdListener(
                new AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                        activitySupplier
                            .get()
                            .runOnUiThread(() -> {
                                isLoadingAd = false;
                                destroyCurrentAd();

                                if (mAdViewLayout != null) {
                                    mAdViewLayout.removeAllViews();
                                    mAdViewLayout.setVisibility(View.GONE);
                                }

                                notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), new BannerAdSizeInfo(0, 0));
                                notifyListeners(
                                    BannerAdPluginEvents.FailedToLoad.getWebEventName(),
                                    new AdMobPluginError(adError)
                                );
                            });
                    }

                    @Override
                    public void onAdOpened() {
                        notifyListeners(BannerAdPluginEvents.Opened.getWebEventName(), emptyObject);
                        super.onAdOpened();
                    }

                    @Override
                    public void onAdClosed() {
                        notifyListeners(BannerAdPluginEvents.Closed.getWebEventName(), emptyObject);
                        super.onAdClosed();
                    }

                    @Override
                    public void onAdClicked() {
                        notifyListeners(BannerAdPluginEvents.Clicked.getWebEventName(), emptyObject);
                        super.onAdClicked();
                    }

                    @Override
                    public void onAdImpression() {
                        notifyListeners(BannerAdPluginEvents.AdImpression.getWebEventName(), emptyObject);
                        super.onAdImpression();
                    }
                }
            )
            .build()
            .loadAd(adRequest);
    }

    private NativeAdView createNativeAdView(NativeAd nativeAd) {
        final Context context = contextSupplier.get();
        final NativeAdView nativeAdView = new NativeAdView(context);
        nativeAdView.setLayoutParams(
            new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        );
        nativeAdView.setBackground(createCardBackground());
        int cardPadding = pxFromDp(12);
        nativeAdView.setPadding(cardPadding, cardPadding, cardPadding, cardPadding);

        final LinearLayout contentLayout = new LinearLayout(context);
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        contentLayout.setLayoutParams(
            new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        );
        nativeAdView.addView(contentLayout);

        final LinearLayout badgeRow = new LinearLayout(context);
        badgeRow.setOrientation(LinearLayout.HORIZONTAL);
        badgeRow.setGravity(Gravity.CENTER_VERTICAL);
        contentLayout.addView(badgeRow);

        final TextView badgeView = buildBadgeView();
        badgeRow.addView(badgeView);

        final TextView headlineView = buildHeadlineView();
        LinearLayout.LayoutParams headlineParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headlineParams.topMargin = pxFromDp(8);
        contentLayout.addView(headlineView, headlineParams);

        final LinearLayout bottomRow = new LinearLayout(context);
        bottomRow.setOrientation(LinearLayout.HORIZONTAL);
        bottomRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams bottomRowParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        bottomRowParams.topMargin = pxFromDp(10);
        contentLayout.addView(bottomRow, bottomRowParams);

        final ImageView iconView = new ImageView(context);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(pxFromDp(38), pxFromDp(38));
        iconView.setLayoutParams(iconParams);
        iconView.setScaleType(ImageView.ScaleType.CENTER_CROP);
        iconView.setBackground(createIconBackground());
        bottomRow.addView(iconView);

        final LinearLayout textWrap = new LinearLayout(context);
        textWrap.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textWrapParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textWrapParams.leftMargin = pxFromDp(10);
        bottomRow.addView(textWrap, textWrapParams);

        final TextView bodyView = buildBodyView();
        textWrap.addView(bodyView);

        final Button callToActionView = buildCallToActionView();
        LinearLayout.LayoutParams ctaParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        ctaParams.leftMargin = pxFromDp(10);
        bottomRow.addView(callToActionView, ctaParams);

        nativeAdView.setHeadlineView(headlineView);
        nativeAdView.setBodyView(bodyView);
        nativeAdView.setIconView(iconView);
        nativeAdView.setCallToActionView(callToActionView);

        headlineView.setText(nativeAd.getHeadline());

        if (nativeAd.getBody() != null) {
            bodyView.setText(nativeAd.getBody());
            bodyView.setVisibility(View.VISIBLE);
        } else {
            bodyView.setVisibility(View.GONE);
        }

        if (nativeAd.getIcon() != null && nativeAd.getIcon().getDrawable() != null) {
            iconView.setImageDrawable(nativeAd.getIcon().getDrawable());
            iconView.setVisibility(View.VISIBLE);
        } else {
            iconView.setVisibility(View.GONE);
        }

        if (nativeAd.getCallToAction() != null) {
            callToActionView.setText(nativeAd.getCallToAction());
            callToActionView.setVisibility(View.VISIBLE);
        } else {
            callToActionView.setVisibility(View.GONE);
        }

        nativeAdView.setNativeAd(nativeAd);
        return nativeAdView;
    }

    private void destroyCurrentAd() {
        if (mAdViewLayout != null) {
            mAdViewLayout.removeAllViews();
        }

        if (mNativeAd != null) {
            mNativeAd.destroy();
            mNativeAd = null;
        }

        mNativeAdView = null;
    }

    private void emitCurrentSize() {
        if (mAdViewLayout == null || mAdViewLayout.getVisibility() != View.VISIBLE) {
            notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), new BannerAdSizeInfo(0, 0));
            return;
        }

        int width = mAdViewLayout.getWidth();
        int height = mAdViewLayout.getHeight();
        if (width <= 0 || height <= 0) {
            return;
        }

        notifyListeners(
            BannerAdPluginEvents.SizeChanged.getWebEventName(),
            new BannerAdSizeInfo(cssPxFromNativePx(width), cssPxFromNativePx(height))
        );
    }

    private GradientDrawable createCardBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(Color.parseColor("#F8FAFC"));
        drawable.setCornerRadius(pxFromDp(20));
        drawable.setStroke(pxFromDp(1), Color.parseColor("#CBD5E1"));
        return drawable;
    }

    private GradientDrawable createIconBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(Color.parseColor("#E2E8F0"));
        drawable.setCornerRadius(pxFromDp(12));
        return drawable;
    }

    private TextView buildBadgeView() {
        TextView view = new TextView(contextSupplier.get());
        view.setText("AD");
        view.setTextColor(Color.parseColor("#92400E"));
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        view.setTypeface(Typeface.DEFAULT_BOLD);
        int horizontalPadding = pxFromDp(8);
        int verticalPadding = pxFromDp(4);
        view.setPadding(horizontalPadding, verticalPadding, horizontalPadding, verticalPadding);

        GradientDrawable badgeBackground = new GradientDrawable();
        badgeBackground.setColor(Color.parseColor("#FEF3C7"));
        badgeBackground.setCornerRadius(pxFromDp(999));
        view.setBackground(badgeBackground);
        return view;
    }

    private TextView buildHeadlineView() {
        TextView view = new TextView(contextSupplier.get());
        view.setTextColor(Color.parseColor("#0F172A"));
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setMaxLines(1);
        view.setEllipsize(TextUtils.TruncateAt.END);
        return view;
    }

    private TextView buildBodyView() {
        TextView view = new TextView(contextSupplier.get());
        view.setTextColor(Color.parseColor("#475569"));
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        view.setLineSpacing(0f, 1.1f);
        view.setMaxLines(2);
        view.setEllipsize(TextUtils.TruncateAt.END);
        return view;
    }

    private Button buildCallToActionView() {
        Button button = new Button(contextSupplier.get());
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setPadding(pxFromDp(12), pxFromDp(8), pxFromDp(12), pxFromDp(8));
        button.setTextColor(Color.WHITE);
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        button.setTypeface(Typeface.DEFAULT_BOLD);

        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.parseColor("#2563EB"));
        background.setCornerRadius(pxFromDp(999));
        button.setBackground(background);
        return button;
    }

    private int pxFromCss(int cssPx) {
        return Math.round(cssPx * contextSupplier.get().getResources().getDisplayMetrics().density);
    }

    private int pxFromDp(int dp) {
        return Math.round(dp * contextSupplier.get().getResources().getDisplayMetrics().density);
    }

    private int cssPxFromNativePx(int nativePx) {
        return Math.round(nativePx / contextSupplier.get().getResources().getDisplayMetrics().density);
    }
}
