(function () {
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get("customer_id");
  const pageId = params.get("page_id");

  const form = document.getElementById("page-form");
  const statusEl = document.getElementById("form-status");
  const summaryEl = document.getElementById("customer-summary");
  const headingEl = document.getElementById("page-heading");
  const qrHolder = document.getElementById("qr-canvas-holder");
  const qrLink = document.getElementById("qr-link");
  const downloadBtn = document.getElementById("download-qr-btn");

  document.getElementById("logout-btn").addEventListener("click", () => AdminAuth.logout());

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "form-status form-status--" + type;
    statusEl.style.display = "block";
  }

  function slugify(text) {
    return (text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function computeExpiry(plan) {
    if (plan === "lifetime") return null;
    const now = new Date();
    const expiry = plan === "monthly" ? addMonths(now, 1) : addYears(now, 1);
    return expiry.toISOString().slice(0, 10);
  }

  let customer = null;
  let existingPage = null;

  async function loadData() {
    await AdminAuth.requireSession();

    if (!customerId) {
      summaryEl.textContent = "No customer specified — open this page from the dashboard.";
      form.style.display = "none";
      return;
    }

    const { data: customerData, error: custErr } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

    if (custErr || !customerData) {
      summaryEl.textContent = "Could not load this customer.";
      form.style.display = "none";
      return;
    }
    customer = customerData;
    summaryEl.textContent = `${customer.couple_name} — ${customer.email} — ${customer.plan} plan`;

    if (pageId) {
      headingEl.textContent = "Edit Loversite Page";
      const { data: pageData } = await supabaseClient
        .from("pages")
        .select("*")
        .eq("id", pageId)
        .maybeSingle();
      existingPage = pageData;
    }

    const prefillSlug = existingPage ? existingPage.slug : slugify(customer.couple_name) + "-" + Math.random().toString(36).slice(2, 6);
    document.getElementById("slug").value = prefillSlug;
    document.getElementById("couple_name").value = existingPage ? existingPage.couple_name : customer.couple_name;
    document.getElementById("start_date").value = existingPage ? existingPage.start_date || "" : "";
    document.getElementById("photo_url").value = existingPage ? existingPage.photo_url || "" : customer.photo_url || "";
    document.getElementById("message").value = existingPage ? existingPage.message || "" : customer.message || "";
    document.getElementById("theme").value = existingPage ? existingPage.theme || "romantic" : "romantic";

    if (existingPage) renderQr(existingPage.slug);
  }

  function renderQr(slug) {
    const url = `${window.APP_CONFIG.SITE_BASE_URL.replace(/\/$/, "")}/love/${slug}`;
    qrHolder.innerHTML = "";
    new QRCode(qrHolder, {
      text: url,
      width: 512,
      height: 512,
      correctLevel: QRCode.CorrectLevel.H,
    });
    qrLink.textContent = url;
    downloadBtn.style.display = "inline-block";
    downloadBtn.onclick = () => {
      const img = qrHolder.querySelector("img") || qrHolder.querySelector("canvas");
      const dataUrl = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}-qr.png`;
      a.click();
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const slug = slugify(document.getElementById("slug").value);
    if (!slug) {
      showStatus("Please enter a valid slug.", "error");
      return;
    }

    const pageRow = {
      customer_id: customerId,
      slug,
      couple_name: document.getElementById("couple_name").value,
      start_date: document.getElementById("start_date").value || null,
      photo_url: document.getElementById("photo_url").value || null,
      message: document.getElementById("message").value || null,
      theme: document.getElementById("theme").value,
    };

    showStatus("Saving...", "info");

    let saveError;
    if (existingPage) {
      const { error } = await supabaseClient.from("pages").update(pageRow).eq("id", existingPage.id);
      saveError = error;
    } else {
      const { error } = await supabaseClient.from("pages").insert([pageRow]);
      saveError = error;
    }

    if (saveError) {
      showStatus("Could not save page: " + saveError.message, "error");
      return;
    }

    const expiryDate = computeExpiry(customer.plan);
    const { error: custUpdateErr } = await supabaseClient
      .from("customers")
      .update({ status: "active", expiry_date: expiryDate })
      .eq("id", customerId);

    if (custUpdateErr) {
      showStatus("Page saved, but could not update customer status: " + custUpdateErr.message, "error");
    } else {
      showStatus("Loversite page saved and activated!", "success");
    }

    renderQr(slug);
  });

  loadData();
})();
