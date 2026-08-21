# QR Keychain Loversite — Concept & Design Reference

This document captures the product concept and the visual/interaction design language of the site, as a reference for continuing work later. For setup/deployment instructions see `README.md`.

## 1. The Concept

A physical **QR keychain** that links to a private, personalized web page (a "Loversite") for a couple — photos, a message, and a running "together for..." counter. No app required; scan and it opens. Sold as a subscription (Monthly / Yearly / Lifetime) with an optional physical keychain add-on. Full business context (audience, pricing, revenue model, tech stack, legal) is in the original business analysis — this file is about the *design*, not the business plan.

**Site structure:**
- `index.html` — public marketing/landing page (the focus of all design work so far)
- `order.html` — order form → Razorpay checkout
- `loversite.html` — the actual product: a couple's private page at `/love/<slug>`
- `admin/` — login, dashboard, page/QR creation tools
- `legal/` — terms, privacy, refund

## 2. Visual Theme

**Mood:** romantic, warm, a little playful — not corporate, not minimalist-cold.

### Color palette (`assets/css/style.css` `:root`)
| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#e0245e` | Buttons, links, accents |
| `--color-primary-dark` | `#b91c4c` | Headings, gradients, hover states |
| `--color-pink` | `#ffe4ec` | Soft backgrounds, badges |
| `--color-gold` | `#d4a537` | Secondary accent (keychain metal, glow) |
| `--color-white` / `--color-text` / `--color-muted` / `--color-border` | — | Base UI |

Design rule established over several iterations: **avoid full-bleed, page-width color blocks.** Every attempt to fade a solid-colored section into the surrounding white page (linear fade, eased/smoothstep fade, wider fade zones) still showed a visible seam — either a Mach-band edge effect or a texture mismatch against the page's photo watermark. The fix that actually worked: keep the page background consistent (white + faint watermark) everywhere, and put color on *contained elements* (cards) instead of full sections. See the showcase section and CTA banner for the pattern to reuse if adding new colored sections.

### Typography
- **`--font-heading`** — Playfair Display (serif): card titles, smaller headings (h3/h4)
- **`--font-body`** — Poppins: all body text, buttons, UI
- **`--font-display`** — Anton (bold condensed uppercase): the hero headline and every major section `<h2>` — the "poster" treatment. Only used for big-impact headings, not body copy or card titles.

### The hero photo
`assets/images/hero-couple.webp` (user-supplied illustration of a couple embracing under a heart-shaped tree canopy) is the site's signature image, used at three intensities:
1. **Hero section** — full treatment, ~32% opacity with a white scrim gradient for text contrast, plus scroll parallax.
2. **Sitewide watermark** — a `position: fixed` `body::before` at 5% opacity, so it's faintly present behind every plain section, tying the whole page together.
3. Removed from the showcase/CTA sections (see color rule above — it caused the same seam problem as flat color).

## 3. Section-by-Section (index.html)

1. **Scroll progress bar** — thin gradient bar, fixed top, fills as you scroll.
2. **Ambient particles** (`#ambient-particles`) — 8 fixed, viewport-relative leaf/flower emoji (🍃🌸🍂🌺🍁) drifting and rotating continuously, visible over every section. Rotation speed reacts to scroll.
3. **Pill nav** (`#site-nav`) — floating rounded capsule, centered, fixed to viewport top. Logo + links + CTA. Collapses links progressively at 460px/380px breakpoints to avoid overflow on small phones. Gains a blurred background once scrolled.
4. **Hero** (`<header class="hero">`)
   - Bold Anton headline with a gradient-text highlight word.
   - Hero photo background + scrim + two blurred color "blobs" (float animation).
   - Hero-scoped leaves (separate from the sitewide ambient ones, denser, clipped to the hero).
   - `.hero__visual-stage`: a phone mockup (dark-themed screen, animated glow + floating heart/sparkle particles, real QR code rendered via `qrcodejs`) with a "Scan me" QR badge floating at its corner, and a **hanging keychain** (ring + bead chain + gold tag with a real mini QR code) swinging above it — CSS 3D transforms driven by scroll velocity (idle sway + a "kick" proportional to scroll speed that damps back to rest, like a real pendulum).
   - All hero elements (phone, QR badge, background, leaves) have independent scroll-driven `rotateX/rotateY/translateZ` transforms for a layered 3D-parallax feel.
5. **How it works** (`#how-it-works`) — plain 3-card grid, icon/title/description, tilts up into view on scroll (`.reveal` class: `rotateX(-10deg) → 0` + fade, via `IntersectionObserver`).
   - *Note:* an earlier version of this section was a pinned, horizontally-scrolling "drive-through" scene with a van and swinging cargo doors. Removed per feedback — too literal/gimmicky. If revisited, the door-opening 3D-hinge technique (`rotateY` on two panels with a shared `perspective`) is worth reusing elsewhere.
6. **Showcase** (`#showcase`) — "Every love story looks different." Bento-style grid of colorful gradient cards (each couple example gets its own `--bento-a`/`--bento-b` CSS custom properties for a unique gradient). Section background is plain (see color rule above).
7. **Pricing** (`#pricing`) — standard 3-tier card grid, "Yearly" visually featured.
8. **CTA banner** — a single centered rounded card (`.cta-banner__card`) with the primary gradient, NOT a full-bleed section background (see color rule above).
9. **Footer** — links to legal pages + admin.

## 4. Interaction/Animation Patterns (reusable)

All animation is hand-rolled vanilla JS in `assets/js/main.js` (no animation library), using `requestAnimationFrame` loops keyed off `window.scrollY`, plus one `IntersectionObserver` for reveal-on-scroll. Everything respects `prefers-reduced-motion` (either skipped in JS or neutralized in CSS).

- **`.reveal` / `.reveal.is-visible`** — the standard "tilt up into place" entrance for any element; add `data-reveal` (and optionally `data-reveal-delay="120"` for stagger) to opt in.
- **Scroll-velocity spring** (the keychain) — track `scrollY` delta per frame, accumulate into an angle with damping (`angle *= 0.9`) each frame — a cheap, convincing pendulum/spring effect without a physics library. Reusable for any "hanging/dangling" element.
- **Parallax layers** — background moves at a fraction of scroll speed (`scrollY * 0.35`), foreground elements move faster/rotate more — creates depth without 3D models.
- **Real QR codes** — `qrcodejs` (CDN, `davidshimjs/qrcodejs@1.0.0`) renders actual scannable QR codes client-side wherever a QR visual is needed (hero mockup, keychain tag, admin panel), rather than a fake striped placeholder graphic.

## 5. Open Items / Ideas Not Yet Done

- CTA banner / showcase could get a lighter-weight decorative treatment (subtle border glow, small corner flourish) now that they no longer carry a big background color block.
- The removed "drive-through" concept could return in a less literal form if desired.
- Admin/order/legal pages have not received the same visual pass as `index.html` — they're functional but plain by comparison.
