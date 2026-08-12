(() => {
  "use strict";

  const menuButton = document.querySelector('[data-js="menu-button"]');
  const mobileNavigation = document.querySelector('[data-js="mobile-navigation"]');

  if (menuButton && mobileNavigation) {
    const setMenuState = (open, returnFocus = false) => {
      menuButton.setAttribute("aria-expanded", String(open));
      mobileNavigation.hidden = !open;
      document.documentElement.toggleAttribute("data-menu-open", open);

      if (returnFocus) {
        menuButton.focus();
      }
    };

    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      setMenuState(open);
    });

    mobileNavigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setMenuState(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, true);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        menuButton.getAttribute("aria-expanded") === "true" &&
        !event.target.closest(".c-header")
      ) {
        setMenuState(false);
      }
    });

    const desktopQuery = window.matchMedia("(min-width: 64rem)");
    desktopQuery.addEventListener("change", (event) => {
      if (event.matches) {
        setMenuState(false);
      }
    });
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealItems = [...document.querySelectorAll("[data-reveal]")];

  if (
    revealItems.length > 0 &&
    !reducedMotion.matches &&
    "IntersectionObserver" in window
  ) {
    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-reveal-state", "visible");
          activeObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 }
    );

    revealItems.forEach((item) => observer.observe(item));
    document.documentElement.setAttribute("data-motion", "ready");

    reducedMotion.addEventListener("change", (event) => {
      if (!event.matches) return;
      document.documentElement.removeAttribute("data-motion");
      revealItems.forEach((item) => {
        item.setAttribute("data-reveal-state", "visible");
        observer.unobserve(item);
      });
    });
  }
})();

