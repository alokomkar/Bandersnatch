"use client";

import { useEffect, useState } from "react";

type Mode = "success" | "mismatch" | "missing";

const scenarios: Record<Mode, { label: string; description: string; tone: string }> = {
  success: {
    label: "Success",
    description: "Coupon accepted and discounted total visible.",
    tone: "Expected parity",
  },
  mismatch: {
    label: "Mismatch",
    description: "Coupon accepted, but the original total remains.",
    tone: "Intentional divergence",
  },
  missing: {
    label: "Missing evidence",
    description: "Coupon accepted, but the total evidence disappears.",
    tone: "Must be incomparable",
  },
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("success");
  const [cartOpen, setCartOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    if (requested === "success" || requested === "mismatch" || requested === "missing") {
      setMode(requested);
    }
  }, []);

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setCartOpen(false);
    setCoupon("");
    setApplied(false);
    window.history.replaceState(null, "", `?mode=${nextMode}`);
  };

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "SAVE10") setApplied(true);
  };

  const total = applied && mode === "success" ? "₹1,799" : "₹1,999";

  return (
    <main>
      <nav className="topbar">
        <div>
          <span className="mark">B</span>
          <strong>Bandersnatch fixtures</strong>
        </div>
        <span className="live"><i /> Public demo surface</span>
      </nav>

      <section className="intro">
        <div>
          <p className="eyebrow">Controlled cross-platform test target</p>
          <h1>One journey.<br />Three outcomes.</h1>
        </div>
        <p className="lede">Use the same cart flow to prove consistency, expose a product mismatch, or verify that missing evidence never becomes a false verdict.</p>
      </section>

      <section className="scenario-picker" aria-label="Fixture scenario">
        {(Object.keys(scenarios) as Mode[]).map((item) => (
          <button
            key={item}
            className={mode === item ? "scenario active" : "scenario"}
            onClick={() => selectMode(item)}
            aria-pressed={mode === item}
          >
            <span>{scenarios[item].label}</span>
            <small>{scenarios[item].description}</small>
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="context">
          <p className="eyebrow">Active fixture</p>
          <h2>{scenarios[mode].label}</h2>
          <p>{scenarios[mode].description}</p>
          <div className={`outcome ${mode}`}>{scenarios[mode].tone}</div>
          <dl>
            <div><dt>Journey</dt><dd>apply_coupon</dd></div>
            <div><dt>Coupon</dt><dd>SAVE10</dd></div>
            <div><dt>Expected total</dt><dd>₹1,799</dd></div>
          </dl>
        </div>

        <div className="checkout" data-testid="checkout">
          <header>
            <div><strong>Bandersnatch Shop</strong><span>Controlled Web test surface</span></div>
            <button data-testid="open-cart" onClick={() => setCartOpen(true)}>Cart · 1</button>
          </header>

          {cartOpen ? (
            <section className="cart" data-testid="cart">
              <p className="eyebrow">Your cart</p>
              <div className="product"><div className="product-art">B</div><div><strong>Everyday backpack</strong><span>Olive · One size</span></div><b>₹1,999</b></div>
              <label htmlFor="coupon">Coupon code</label>
              <div className="coupon-row">
                <input id="coupon" data-testid="coupon-input" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="SAVE10" />
                <button data-testid="apply-coupon" onClick={applyCoupon}>Apply</button>
              </div>
              <p className="coupon-status" data-testid="coupon-status" aria-live="polite">{applied ? "Coupon SAVE10 applied" : ""}</p>
              {!(applied && mode === "missing") && (
                <div className="total" data-testid="total"><span>Total</span><strong>{total}</strong></div>
              )}
            </section>
          ) : (
            <div className="empty"><span>1</span><p>Open the cart to start the shared journey.</p></div>
          )}
        </div>
      </section>
      <footer>Stable test IDs · No authentication · No payments · Reset by changing scenario</footer>
    </main>
  );
}
