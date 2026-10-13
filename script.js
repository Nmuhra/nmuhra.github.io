const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* THEME */

function applyTheme(theme) {
  root.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#fafaf9" : "#09090b");
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
}

function toggleTheme(event) {
  const theme = root.dataset.theme === "light" ? "dark" : "light";

  if (!document.startViewTransition || reduceMotion.matches) {
    applyTheme(theme);
    return;
  }

  // Grow the new theme outward from the toggle button
  const rect = event?.currentTarget?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document.startViewTransition(() => applyTheme(theme)).ready.then(() => {
    root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 550,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
}

applyTheme(root.dataset.theme);

/* MENU */

const menu = document.querySelector(".nav-links");
const hamburger = document.querySelector(".hamburger");

function toggleMenu(force) {
  const open = menu.classList.toggle("open", force);
  hamburger.classList.toggle("open", open);
  hamburger.setAttribute("aria-expanded", open);
}

menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => toggleMenu(false));
});

document.addEventListener("click", (e) => {
  if (menu.classList.contains("open") && !e.target.closest(".nav")) {
    toggleMenu(false);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleMenu(false);
});

/* HEADER + SCROLL PROGRESS */

const header = document.querySelector(".site-header");
const progress = document.querySelector(".scroll-progress");
let ticking = false;

function onScroll() {
  const max = root.scrollHeight - innerHeight;
  header.classList.toggle("scrolled", scrollY > 16);
  progress.style.setProperty("--progress", max > 0 ? scrollY / max : 0);
  ticking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  },
  { passive: true }
);
onScroll();

/* ACTIVE NAV LINK */

const navLinks = [...menu.querySelectorAll('a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((link) =>
          link.classList.toggle("active", link.getAttribute("href") === id)
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((section) => sectionObserver.observe(section));
}

/* REVEAL ON SCROLL (staggered within each group) */

const revealEls = document.querySelectorAll(".reveal");

revealEls.forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) =>
    c.classList.contains("reveal")
  );
  el.style.setProperty("--delay", `${Math.min(siblings.indexOf(el), 6) * 90}ms`);
});

function finishReveal(el) {
  // Hand transitions back to the element's own hover styles
  const done = (e) => {
    if (e.target !== el) return;
    el.removeEventListener("transitionend", done);
    el.classList.remove("reveal", "visible");
    el.style.removeProperty("--delay");
  };
  el.addEventListener("transitionend", done);
  el.classList.add("visible");
}

if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          finishReveal(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.remove("reveal"));
}

/* CARD SPOTLIGHT */

if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });
}

/* NEURAL NETWORK (AI / ML card) */

const net = document.querySelector(".neural-net");

if (net) {
  const NS = "http://www.w3.org/2000/svg";
  const layers = [3, 5, 5, 2];
  const [w, h, pad] = [320, 170, 14];
  const cycle = 3.6; // seconds for one forward pass, including a pause
  const travel = cycle * 0.22; // matches the 22% travel in the nn-pulse keyframes

  const el = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  const points = layers.map((count, i) => {
    const x = pad + (i * (w - pad * 2)) / (layers.length - 1);
    const gap = (h - pad * 2) / Math.max(...layers);
    const top = h / 2 - ((count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, j) => ({ x, y: top + j * gap }));
  });

  const edges = el("g", {});
  const pulses = el("g", {});
  const glows = el("g", {});
  const nodes = el("g", {});
  const timing = (delay) => `--cycle:${cycle}s;--delay:${delay.toFixed(2)}s`;
  const line = (a, b, cls, style) =>
    el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls, pathLength: 1, ...(style && { style }) });

  points.forEach((layer, i) => {
    layer.forEach((p) => {
      nodes.append(el("circle", { cx: p.x, cy: p.y, r: 4, class: "nn-node" }));
      points[i + 1]?.forEach((q) => edges.append(line(p, q, "nn-edge")));
    });
  });

  // One sparse forward pass: every input fires, and a later node fires only
  // when a signal from an active node in the previous layer reaches it
  function forwardPass() {
    pulses.replaceChildren();
    glows.replaceChildren();
    let active = new Set(points[0].keys());

    points.forEach((layer, i) => {
      active.forEach((j) => {
        const { x, y } = layer[j];
        glows.append(el("circle", { cx: x, cy: y, r: 7, class: "nn-glow", style: timing(i * travel) }));
      });

      const next = points[i + 1];
      if (!next) return;

      const reached = new Set();
      active.forEach((j) => {
        next.forEach((q, k) => {
          if (Math.random() < 0.3) {
            reached.add(k);
            pulses.append(line(layer[j], q, "nn-pulse", timing(i * travel)));
          }
        });
      });

      // keep the signal alive if no connection happened to fire
      if (!reached.size) {
        const [j] = active;
        const k = Math.floor(Math.random() * next.length);
        reached.add(k);
        pulses.append(line(layer[j], next[k], "nn-pulse", timing(i * travel)));
      }
      active = reached;
    });
  }

  net.append(edges, pulses, glows, nodes);
  forwardPass();

  // A fresh random pass each cycle, only while the card is on screen
  let timer;
  const setLive = (live) => {
    net.classList.toggle("is-live", live);
    clearInterval(timer);
    if (live && !reduceMotion.matches) timer = setInterval(forwardPass, cycle * 1000);
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => setLive(entry.isIntersecting)).observe(net);
  } else {
    setLive(true);
  }
}

/* PORTRAIT TILT */

const portrait = document.querySelector(".portrait");

if (portrait && window.matchMedia("(hover: hover)").matches && !reduceMotion.matches) {
  const tilt = portrait.querySelector(".portrait__tilt");
  const img = portrait.querySelector(".portrait__img");

  portrait.addEventListener("pointermove", (e) => {
    const rect = portrait.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    portrait.classList.add("is-tilting");
    tilt.style.setProperty("--tilt-x", `${(0.5 - y) * 6}deg`);
    tilt.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
    img.style.setProperty("--glare-x", `${x * 100}%`);
    img.style.setProperty("--glare-y", `${y * 100}%`);
  });

  portrait.addEventListener("pointerleave", () => {
    portrait.classList.remove("is-tilting");
    tilt.style.removeProperty("--tilt-x");
    tilt.style.removeProperty("--tilt-y");
  });
}

/* COPY EMAIL */

const toast = document.querySelector(".toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("copied");
      button.querySelector(".email-box__label").textContent = "Copied";
      showToast("Email copied to clipboard");
      setTimeout(() => {
        button.classList.remove("copied");
        button.querySelector(".email-box__label").textContent = "Copy";
      }, 2200);
    } catch (e) {
      location.href = `mailto:${button.dataset.copy}`;
    }
  });
});

/* FOOTER YEAR */

document.getElementById("year").textContent = new Date().getFullYear();

/* LIGHTBOX (gallery photos and project screenshots) */

const lightbox = document.querySelector(".lightbox");
const lightboxGroups = {};
let group = [];
let current = 0;

document.querySelectorAll("[data-lightbox]").forEach((btn) => {
  (lightboxGroups[btn.dataset.lightbox] ??= []).push(btn);
});

function photoMeta(btn) {
  const item = btn.closest(".gallery__item");
  return {
    title: btn.dataset.title ?? item.querySelector(".gallery__title").textContent,
    sub: btn.dataset.sub ?? item.querySelector(".gallery__sub").textContent,
  };
}

function showPhoto(index) {
  current = (index + group.length) % group.length;
  const btn = group[current];
  const img = btn.querySelector("img");
  const lbImg = lightbox.querySelector(".lightbox__img");
  const { title, sub } = photoMeta(btn);
  lbImg.src = btn.dataset.full || img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lightbox.querySelector(".gallery__title").textContent = title;
  lightbox.querySelector(".gallery__sub").textContent = sub;
  lightbox.querySelector(".lightbox__count").textContent = `${String(
    current + 1
  ).padStart(2, "0")} / ${String(group.length).padStart(2, "0")}`;
}

if (lightbox) {
  Object.values(lightboxGroups).forEach((buttons) => {
    buttons.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        group = buttons;
        showPhoto(i);
        lightbox.showModal();
      });
    });
  });

  lightbox.querySelector(".lightbox__close").addEventListener("click", () => lightbox.close());
  lightbox.querySelector(".lightbox__prev").addEventListener("click", () => showPhoto(current - 1));
  lightbox.querySelector(".lightbox__next").addEventListener("click", () => showPhoto(current + 1));

  // Clicking the dimmed area around the photo closes the viewer
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox__figure")) {
      lightbox.close();
    }
  });

  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showPhoto(current - 1);
    if (e.key === "ArrowRight") showPhoto(current + 1);
  });

  // Swipe between photos on touch screens
  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
}
