// Shared by every admin/*.html page (loaded after supabaseClient.js).
const AdminAuth = {
  async requireSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "index.html";
      return null;
    }
    return session;
  },

  async logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
};
