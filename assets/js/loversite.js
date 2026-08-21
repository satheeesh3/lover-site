(function () {
  const root = document.getElementById("loversite-root");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("c");

  function renderState(message) {
    root.innerHTML = `<div class="loversite__state">${message}</div>`;
  }

  function formatDuration(startDateStr) {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    let diffMs = now - start;
    if (diffMs < 0) diffMs = 0;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const remAfterYears = totalDays % 365;
    const months = Math.floor(remAfterYears / 30);
    const days = remAfterYears % 30;

    const parts = [];
    if (years) parts.push(`${years} year${years > 1 ? "s" : ""}`);
    if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
    parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    return { totalDays, text: parts.join(", ") };
  }

  async function load() {
    if (!slug) {
      renderState("This Loversite link looks incomplete.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("pages")
      .select("couple_name, photo_url, message, start_date, theme")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      renderState("We couldn't find this Loversite. Double-check the link or QR code.");
      return;
    }

    const counter = data.start_date ? formatDuration(data.start_date) : null;

    root.innerHTML = `
      <div class="loversite__card">
        ${data.photo_url ? `<img class="loversite__photo" src="${escapeAttr(data.photo_url)}" alt="${escapeAttr(data.couple_name)}" />` : ""}
        <h1 class="loversite__names">${escapeHtml(data.couple_name)}</h1>
        ${data.message ? `<p class="loversite__message">"${escapeHtml(data.message)}"</p>` : ""}
        ${counter ? `<div class="loversite__counter">💕 Together for ${counter.text}</div>` : ""}
      </div>
    `;

    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  load();
})();
