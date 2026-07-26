package com.bandersnatch.fixture;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final int GREEN = Color.rgb(23, 107, 77);
    private LinearLayout cart;
    private EditText coupon;
    private TextView status;
    private TextView total;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildScreen());
    }

    private View buildScreen() {
        LinearLayout screen = column(24);
        screen.setPadding(dp(24), dp(40), dp(24), dp(24));
        screen.setBackgroundColor(Color.rgb(244, 242, 235));

        TextView brand = text("Bandersnatch Shop", 26);
        brand.setId(R.id.shop_title);
        screen.addView(brand);
        screen.addView(text("Controlled Android test surface", 14));

        Button openCart = button("Cart · 1");
        openCart.setId(R.id.open_cart);
        openCart.setContentDescription("Open cart");
        openCart.setOnClickListener(view -> cart.setVisibility(View.VISIBLE));
        screen.addView(openCart, margins(0, 28, 0, 0));

        cart = column(14);
        cart.setId(R.id.cart);
        cart.setContentDescription("Cart");
        cart.setVisibility(View.GONE);
        cart.addView(text("Your cart", 24));
        cart.addView(text("Everyday backpack", 17));

        coupon = new EditText(this);
        coupon.setId(R.id.coupon_input);
        coupon.setHint("Coupon code");
        coupon.setContentDescription("Coupon code");
        coupon.setSingleLine(true);
        coupon.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        cart.addView(coupon, matchWidth());

        Button apply = button("Apply coupon");
        apply.setId(R.id.apply_coupon);
        apply.setContentDescription("Apply coupon");
        apply.setOnClickListener(view -> applyCoupon());
        cart.addView(apply);

        status = text("", 16);
        status.setId(R.id.coupon_status);
        status.setContentDescription("Coupon status");
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        status.setTextColor(GREEN);
        cart.addView(status);

        total = text("Total: ₹1,999", 22);
        total.setId(R.id.total);
        total.setContentDescription("Cart total ₹1,999");
        cart.addView(total, margins(0, 18, 0, 0));
        screen.addView(cart, margins(0, 24, 0, 0));
        return screen;
    }

    private void applyCoupon() {
        if ("SAVE10".equals(coupon.getText().toString().trim().toUpperCase())) {
            String result = "Coupon SAVE10 applied. Discounted cart total ₹1,799";
            status.setText("Coupon SAVE10 applied");
            status.setContentDescription(result);
            total.setText("Total: ₹1,799");
            total.setContentDescription("Discounted cart total ₹1,799");
            status.announceForAccessibility(result);
        } else {
            String result = "Coupon not recognised";
            status.setText(result);
            status.setContentDescription(result);
            status.announceForAccessibility(result);
        }
    }

    private LinearLayout column(int spacing) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setShowDividers(LinearLayout.SHOW_DIVIDER_MIDDLE);
        layout.setDividerPadding(dp(spacing));
        layout.setLayoutParams(matchWidth());
        return layout;
    }

    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(Color.rgb(24, 32, 28));
        return view;
    }

    private Button button(String value) {
        Button view = new Button(this);
        view.setText(value);
        view.setTextColor(Color.WHITE);
        view.setBackgroundColor(GREEN);
        return view;
    }

    private LinearLayout.LayoutParams matchWidth() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams margins(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = matchWidth();
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
