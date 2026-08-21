(function () {
  const form = document.getElementById("order-form");
  const planSelect = document.getElementById("plan");
  const keychainCheckbox = document.getElementById("keychain_addon");
  const totalDisplay = document.getElementById("total_display");
  const statusEl = document.getElementById("form-status");
  const payBtn = document.getElementById("pay-btn");

  const PRICES = window.APP_CONFIG.PLAN_PRICES;
  const KEYCHAIN_PRICE = 299;

  // Preselect plan from ?plan=monthly|yearly|lifetime
  const params = new URLSearchParams(window.location.search);
  const requestedPlan = params.get("plan");
  if (requestedPlan && PRICES[requestedPlan]) {
    planSelect.value = requestedPlan;
  }

  function currentTotal() {
    const plan = planSelect.value;
    let total = PRICES[plan] || 0;
    if (keychainCheckbox.checked) total += KEYCHAIN_PRICE;
    return total;
  }

  function renderTotal() {
    totalDisplay.textContent = "₹" + currentTotal().toLocaleString("en-IN");
  }

  planSelect.addEventListener("change", renderTotal);
  keychainCheckbox.addEventListener("change", renderTotal);
  renderTotal();

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "form-status form-status--" + type;
    statusEl.style.display = "block";
  }

  function setFieldError(name, show) {
    const el = form.querySelector('[data-error-for="' + name + '"]');
    if (el) el.style.display = show ? "block" : "none";
  }

  function validate(data) {
    let valid = true;
    if (!data.couple_name.trim()) {
      setFieldError("couple_name", true);
      valid = false;
    } else {
      setFieldError("couple_name", false);
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    setFieldError("email", !emailOk);
    if (!emailOk) valid = false;

    const phoneOk = /^\d{10}$/.test(data.phone.replace(/\D/g, "").slice(-10));
    setFieldError("phone", !phoneOk);
    if (!phoneOk) valid = false;

    if (!data.message.trim()) {
      setFieldError("message", true);
      valid = false;
    } else {
      setFieldError("message", false);
    }

    return valid;
  }

  async function uploadPhoto(file) {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `orders/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseClient.storage.from("photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error("Photo upload failed: " + error.message);
    const { data } = supabaseClient.storage.from("photos").getPublicUrl(path);
    return data.publicUrl;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
      couple_name: form.couple_name.value,
      email: form.email.value,
      phone: form.phone.value,
      plan: form.plan.value,
      message: form.message.value,
      keychain_addon: keychainCheckbox.checked,
    };

    if (!validate(data)) {
      showStatus("Please fix the highlighted fields.", "error");
      return;
    }

    payBtn.disabled = true;
    payBtn.textContent = "Preparing payment...";
    showStatus("Uploading your photo and preparing checkout...", "info");

    try {
      const photoFile = form.photo.files[0] || null;
      const photoUrl = await uploadPhoto(photoFile);

      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: data.plan, keychain_addon: data.keychain_addon }),
      });
      if (!orderRes.ok) throw new Error("Could not start checkout. Please try again.");
      const order = await orderRes.json();

      const rzp = new Razorpay({
        key: window.APP_CONFIG.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "QR Keychain Loversite",
        description: data.plan + " plan",
        prefill: { email: data.email, contact: data.phone },
        theme: { color: "#e0245e" },
        handler: async function (response) {
          showStatus("Confirming your payment...", "info");
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer: {
                  couple_name: data.couple_name,
                  email: data.email,
                  phone: data.phone,
                  plan: data.plan,
                  photo_url: photoUrl,
                  message: data.message,
                },
              }),
            });
            if (!verifyRes.ok) throw new Error("Payment verification failed.");
            showStatus("Payment successful! We'll set up your Loversite and email you within 24 hours. 💕", "success");
            form.reset();
            renderTotal();
          } catch (err) {
            showStatus(err.message || "Something went wrong confirming your payment.", "error");
          } finally {
            payBtn.disabled = false;
            payBtn.textContent = "Pay & Continue";
          }
        },
        modal: {
          ondismiss: function () {
            payBtn.disabled = false;
            payBtn.textContent = "Pay & Continue";
            showStatus("Checkout closed. No payment was made.", "info");
          },
        },
      });
      rzp.open();
    } catch (err) {
      showStatus(err.message || "Something went wrong. Please try again.", "error");
      payBtn.disabled = false;
      payBtn.textContent = "Pay & Continue";
    }
  });
})();
