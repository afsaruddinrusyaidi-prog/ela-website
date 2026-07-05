/* ELA — shared interactions */
(function () {
  "use strict";

  /* mobile nav */
  const burger = document.querySelector(".nav-burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* scroll reveal */
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealables.length) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("in"));
  }

  /* count-up metrics: <span data-count="2500" data-suffix="+"> */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); }
      }),
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* tab switcher: .tab-btn[data-tab] toggles [data-panel] */
  const tabBtns = document.querySelectorAll(".tab-btn[data-tab]");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => { b.classList.toggle("active", b === btn); b.setAttribute("aria-selected", b === btn); });
      document.querySelectorAll("[data-panel]").forEach((p) => {
        p.hidden = p.dataset.panel !== btn.dataset.tab;
      });
    });
  });

  /* ---- lightbox (shared for video + photo). One player alive at a time. ---- */
  let lb = null;
  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button class="close" aria-label="Close">✕</button><div class="lb-body"></div><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    const shut = () => {
      lb.classList.remove("open");
      lb.querySelector(".lb-body").innerHTML = ""; /* unmount video -> frees memory */
      document.body.style.overflow = "";
    };
    lb.querySelector(".close").addEventListener("click", shut);
    lb.addEventListener("click", (e) => { if (e.target === lb) shut(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); });
    return lb;
  }

  window.ELA = {
    openVideo(src, caption) {
      const box = ensureLightbox();
      box.querySelector(".lb-body").innerHTML =
        '<video controls autoplay playsinline preload="metadata" src="' + src + '"></video>';
      box.querySelector(".lb-cap").textContent = caption || "";
      box.classList.add("open");
      document.body.style.overflow = "hidden";
    },
    openPhoto(src, caption) {
      const box = ensureLightbox();
      box.querySelector(".lb-body").innerHTML = '<img src="' + src + '" alt="">';
      box.querySelector(".lb-cap").textContent = caption || "";
      box.classList.add("open");
      document.body.style.overflow = "hidden";
    },
  };

  /* ---- media page renderer (reads window.ELA_MEDIA from media.js) ---- */
  const vGrid = document.getElementById("video-grid");
  const pGrid = document.getElementById("photo-grid");
  if ((vGrid || pGrid) && window.ELA_MEDIA) {
    const data = window.ELA_MEDIA;
    const fmt = (d) =>
      new Date(d + "T00:00:00").toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });

    function renderVideos(filter) {
      vGrid.innerHTML = "";
      const items = data.videos.filter((v) => filter === "ALL" || v.channel === filter);
      if (!items.length) {
        vGrid.innerHTML =
          '<p style="grid-column:1/-1;color:var(--mist-dim);font-size:14px;">No videos curated from this channel yet — visit the Instagram profile for the latest reels.</p>';
        return;
      }
      items.forEach((v) => {
          const tile = document.createElement("button");
          tile.className = "video-tile";
          tile.setAttribute("aria-label", "Play video: " + (v.caption || v.channel));
          tile.innerHTML =
            '<div class="thumb"><img loading="lazy" src="' + v.poster + '" alt="">' +
            '<div class="play"><span class="ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span></div></div>' +
            '<div class="meta"><div class="chan">@' + v.channel.toLowerCase() + " · instagram</div>" +
            '<div class="cap">' + (v.caption || "Watch on the channel") + "</div>" +
            '<div class="date">' + fmt(v.date) + "</div></div>";
          tile.addEventListener("click", () => window.ELA.openVideo(v.src, v.caption));
          vGrid.appendChild(tile);
      });
    }

    function renderPhotos(filter) {
      pGrid.innerHTML = "";
      data.photos
        .filter((p) => filter === "ALL" || p.channel === filter)
        .forEach((p) => {
          const cell = document.createElement("button");
          cell.className = "photo-cell";
          cell.setAttribute("aria-label", "View photo: " + (p.caption || p.channel));
          cell.innerHTML =
            '<img loading="lazy" src="' + p.src + '" alt=""><span class="ch">' + p.channel + "</span>";
          cell.addEventListener("click", () => window.ELA.openPhoto(p.src, p.caption));
          pGrid.appendChild(cell);
        });
    }

    if (vGrid) renderVideos("ALL");
    if (pGrid) renderPhotos("ALL");

    document.querySelectorAll(".filter-btn[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
        if (vGrid) renderVideos(btn.dataset.filter);
        if (pGrid) renderPhotos(btn.dataset.filter);
      });
    });
  }
})();
