
document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") {
    console.error("GSAP не загрузился");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Учитываем настройки доступности
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(
      ".hero__lead, .hero h1, .hero__sub, .hero__actions .btn, .hero__bottom span",
      { clearProps: "all" }
    );
    return;
  }

  // 1. Анимация первого экрана
  const heroTimeline = gsap.timeline({
    defaults: {
      ease: "power3.out"
    }
  });

  heroTimeline
    .from(".hero__lead", {
      opacity: 0,
      y: 30,
      duration: 0.8
    })
    .from(".hero h1", {
      opacity: 0,
      y: 70,
      duration: 1.1
    }, "-=0.3")
    .from(".hero__sub", {
      opacity: 0,
      y: 30,
      duration: 0.8
    }, "-=0.5")
    .from(".hero__actions .btn", {
      opacity: 0,
      y: 25,
      duration: 0.7,
      stagger: 0.2
    }, "-=0.4")
    .from(".hero__bottom span", {
      opacity: 0,
      y: 15,
      duration: 0.6,
      stagger: 0.2
    }, "-=0.3");

  // 2. Медленное движение фона
  gsap.to(".hero", {
    backgroundSize: "110% auto",
    duration: 15,
    ease: "none"
  });

  // 3. Появление элементов при прокрутке
  const revealElements = gsap.utils.toArray(
    ".section__title, .section__text, .price"
  );

  revealElements.forEach((element) => {
    gsap.from(element, {
      opacity: 0,
      y: 45,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 88%",
        once: true
      }
    });
  });

  // 4. Последовательное появление галереи
  const gallery = document.querySelector(".gallery");

  if (gallery) {
    const shots = gsap.utils.toArray(".gallery .shot");

    gsap.from(shots, {
      opacity: 0,
      y: 50,
      duration: 1,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: gallery,
        start: "top 85%",
        once: true
      }
    });
  }

  // 5. Эффект увеличения фотографий
  const photos = document.querySelectorAll(".shot img");

  photos.forEach((photo) => {
    const shot = photo.closest(".shot");

    if (!shot) return;

    shot.addEventListener("mouseenter", () => {
      gsap.to(photo, {
        scale: 1.07,
        duration: 0.6,
        ease: "power2.out"
      });
    });

    shot.addEventListener("mouseleave", () => {
      gsap.to(photo, {
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      });
    });
  });
// 6. Custom cursor
const cursor = document.querySelector(".custom-cursor");
const cursorDot = document.querySelector(".cursor-dot");

if (
  cursor &&
  cursorDot &&
  window.matchMedia("(pointer: fine)").matches
) {
  const moveCursor = gsap.quickTo(cursor, "x", {
    duration: 0.35,
    ease: "power3.out"
  });

  const moveCursorY = gsap.quickTo(cursor, "y", {
    duration: 0.35,
    ease: "power3.out"
  });

  const moveDotX = gsap.quickTo(cursorDot, "x", {
    duration: 0.12
  });

  const moveDotY = gsap.quickTo(cursorDot, "y", {
    duration: 0.12
  });

  window.addEventListener("mousemove", (event) => {
    moveCursor(event.clientX);
    moveCursorY(event.clientY);

    moveDotX(event.clientX);
    moveDotY(event.clientY);
  });

  document.querySelectorAll("a, button, .shot").forEach((element) => {
    element.addEventListener("mouseenter", () => {
      cursor.classList.add("is-hovering");
    });

    element.addEventListener("mouseleave", () => {
      cursor.classList.remove("is-hovering");
    });
  });
}

// 7. Magnetic buttons
if (window.matchMedia("(pointer: fine)").matches) {
  const magneticButtons = document.querySelectorAll(".btn");

  magneticButtons.forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();

      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      gsap.to(button, {
        x: x * 0.2,
        y: y * 0.2,
        duration: 0.3,
        ease: "power2.out"
      });
    });

    button.addEventListener("mouseleave", () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.4)"
      });
    });
  });
}
  console.log("Barber Studio animations initialized");
});

