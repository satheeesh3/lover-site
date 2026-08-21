(function () {
  // Real, scannable QR code for the hanging keychain preview (previously a
  // fake striped placeholder pattern).
  if (window.QRCode) {
    const demoUrl = window.APP_CONFIG && window.APP_CONFIG.SITE_BASE_URL
      ? window.APP_CONFIG.SITE_BASE_URL.replace(/\/$/, "") + "/love/rahul-anjali"
      : "https://loversite.app/love/rahul-anjali";

    const keychainQrEl = document.getElementById("keychain-qr-code");
    if (keychainQrEl) {
      new QRCode(keychainQrEl, {
        text: demoUrl,
        width: 30,
        height: 30,
        colorDark: "#201017",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L,
      });
    }
  }

  // Scroll progress bar
  const progressBar = document.getElementById("scroll-progress");
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
  }

  // Nav background once the page has scrolled past the hero
  const nav = document.getElementById("site-nav");
  function updateNav() {
    if (!nav) return;
    nav.classList.toggle("nav--scrolled", window.scrollY > 40);
  }

  function onScroll() {
    updateProgress();
    updateNav();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal-on-scroll for anything marked [data-reveal]
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    revealEls.forEach((el) => {
      const delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.setProperty("--reveal-delay", delay + "ms");
      observer.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // 3D scroll tilt/parallax for the hero mockups and leaves. The hero photo
  // itself (#hero-bg) stays static/stable now — it fades out via a CSS mask
  // instead of moving, so its fade lines up exactly with the sitewide
  // watermark it hands off to at the bottom of the hero.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = document.querySelector(".mockup-phone");
  const hero = document.querySelector(".hero");
  const leaves = document.querySelectorAll(".leaf");

  if (!prefersReducedMotion && hero) {
    function tick() {
      const heroHeight = hero.offsetHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
      const t = performance.now();

      if (phone) {
        const bobPhone = Math.sin(t / 900) * 10;
        phone.style.transform =
          `perspective(1400px) ` +
          `rotateY(${-16 * progress}deg) ` +
          `rotateX(${8 * progress}deg) ` +
          `translateY(${bobPhone - 50 * progress}px) ` +
          `translateZ(${-40 * progress}px) ` +
          `scale(${1 - 0.06 * progress})`;
      }

      leaves.forEach((leaf, i) => {
        const speed = parseFloat(leaf.dataset.speed) || 1;
        const sway = Math.sin(t / 1400 + i) * 12;
        const rotate = window.scrollY * 0.05 * speed + Math.sin(t / 1600 + i) * 10;
        leaf.style.transform =
          `translateY(${window.scrollY * 0.25 * speed}px) ` +
          `translateX(${sway}px) ` +
          `rotate(${rotate}deg)`;
      });

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Hanging QR keychain: swings like a real pendulum. A gentle idle sway
  // plus a scroll-velocity "kick" that decays back to rest, with a 3D
  // rotateY wobble so it reads as an object hanging in space, not a flat sticker.
  const keychain = document.getElementById("keychain");

  if (!prefersReducedMotion && keychain) {
    let lastScrollYForKeychain = window.scrollY;
    let kickAngle = 0;

    function keychainTick() {
      const t = performance.now();
      const scrollDelta = window.scrollY - lastScrollYForKeychain;
      lastScrollYForKeychain = window.scrollY;

      kickAngle += scrollDelta * 0.6;
      kickAngle *= 0.9; // damping, spring settles back to rest
      kickAngle = Math.max(-22, Math.min(22, kickAngle));

      const idleSway = Math.sin(t / 850) * 4;
      const rotateZ = idleSway + kickAngle;
      const rotateY = Math.sin(t / 1100) * 10;

      keychain.style.transform =
        `perspective(700px) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`;

      requestAnimationFrame(keychainTick);
    }
    requestAnimationFrame(keychainTick);
  }

  // Ambient leaves/flowers drifting over the whole page (fixed to the
  // viewport, so they're visible above every section as you scroll).
  const ambientLeaves = document.querySelectorAll(".ambient-leaf");

  if (!prefersReducedMotion && ambientLeaves.length) {
    function ambientTick() {
      const t = performance.now();
      const scrollY = window.scrollY;

      ambientLeaves.forEach((leaf, i) => {
        const speed = parseFloat(leaf.dataset.speed) || 1;
        const swayX = Math.sin(t / 1800 + i * 1.7) * 18;
        const swayY = Math.cos(t / 2200 + i * 1.3) * 14;
        const rotate = scrollY * 0.08 * speed + Math.sin(t / 1500 + i) * 15;
        leaf.style.transform =
          `translate(${swayX}px, ${swayY}px) ` +
          `rotate(${rotate}deg)`;
      });

      requestAnimationFrame(ambientTick);
    }
    requestAnimationFrame(ambientTick);
  }
})();
