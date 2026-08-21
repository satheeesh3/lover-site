(function () {
  const tbody = document.getElementById("customers-tbody");
  document.getElementById("logout-btn").addEventListener("click", () => AdminAuth.logout());

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  async function load() {
    await AdminAuth.requireSession();

    const { data: customers, error: custErr } = await supabaseClient
      .from("customers")
      .select("id, couple_name, email, phone, plan, status, expiry_date, created_at")
      .order("created_at", { ascending: false });

    if (custErr) {
      tbody.innerHTML = `<tr><td colspan="8">Could not load customers: ${escapeHtml(custErr.message)}</td></tr>`;
      return;
    }

    const { data: pages } = await supabaseClient
      .from("pages")
      .select("id, customer_id, slug, views");

    const pagesByCustomer = new Map((pages || []).map((p) => [p.customer_id, p]));

    if (!customers || customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">No orders yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers
      .map((c) => {
        const page = pagesByCustomer.get(c.id);
        const pageCell = page
          ? `<a href="/love/${escapeHtml(page.slug)}" target="_blank">/love/${escapeHtml(page.slug)}</a>`
          : "<em>not created</em>";
        const actionCell = page
          ? `<a href="create.html?customer_id=${c.id}&page_id=${page.id}">Edit</a>`
          : `<a href="create.html?customer_id=${c.id}">Create Page</a>`;

        return `
          <tr>
            <td>${escapeHtml(c.couple_name)}</td>
            <td>${escapeHtml(c.email)}<br /><span style="color:var(--color-muted)">${escapeHtml(c.phone || "")}</span></td>
            <td>${escapeHtml(c.plan)}</td>
            <td><span class="badge badge-${escapeHtml(c.status)}">${escapeHtml(c.status)}</span></td>
            <td>${c.expiry_date ? escapeHtml(c.expiry_date) : "—"}</td>
            <td>${pageCell}</td>
            <td>${page ? page.views : "—"}</td>
            <td class="admin-actions">${actionCell}</td>
          </tr>
        `;
      })
      .join("");
  }

  load();
})();
