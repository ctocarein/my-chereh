"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const slides = [
  {
    title: "Bienvenue",
    description: "CheReh ton meilleur Compagnon de Sante",
  },
  {
    title: "Questionnaire simple",
    description: "Une question par ecran, sans jargon ni pression.",
  },
  {
    title: "Orientation claire",
    description: "Un message net et une action concrete pour avancer.",
  },
];

export default function Home() {
  const router = useRouter();
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [startHref, setStartHref] = useState("/consent");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasConsent = window.localStorage.getItem("chereh_consent_v1") === "1";
    const hasAuthToken =
      !!window.localStorage.getItem("chereh_auth_token")?.trim();
    const nextHref = hasAuthToken ? "/profile" : hasConsent ? "/signin" : "/consent";
    setStartHref(nextHref);

    if (hasAuthToken || hasConsent) {
      router.replace(nextHref);
    }
  }, [router]);

  useEffect(() => {
    const container = swipeRef.current;

    if (!container) {
      return;
    }

    let frame = 0;

    const updateActiveIndex = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const slidesEls = Array.from(container.children) as HTMLElement[];
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        let closestIndex = 0;
        let smallestDistance = Number.POSITIVE_INFINITY;

        slidesEls.forEach((slide, index) => {
          const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
          const distance = Math.abs(containerCenter - slideCenter);

          if (distance < smallestDistance) {
            smallestDistance = distance;
            closestIndex = index;
          }
        });

        setActiveIndex(closestIndex);
      });
    };

    updateActiveIndex();
    container.addEventListener("scroll", updateActiveIndex, { passive: true });

    return () => {
      container.removeEventListener("scroll", updateActiveIndex);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const updateInstallState = () => {
      const isIosStandalone =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
      const isAndroidReferrer = document.referrer.startsWith("android-app://");
      const standaloneQuery = window.matchMedia("(display-mode: standalone)");
      const browserQuery = window.matchMedia("(display-mode: browser)");
      const isBrowserMode =
        browserQuery.media !== "not all" && browserQuery.matches;
      const isStandalone = standaloneQuery.matches && !isBrowserMode;
      const nextInstalled = isIosStandalone || isAndroidReferrer || isStandalone;

      setIsInstalled(nextInstalled);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    updateInstallState();
    window.addEventListener("appinstalled", updateInstallState);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateInstallState);
    } else {
      mediaQuery.addListener(updateInstallState);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", updateInstallState);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateInstallState);
      } else {
        mediaQuery.removeListener(updateInstallState);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }

    const promptEvent = installPrompt as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
    } finally {
      setInstallPrompt(null);
    }
  };

  const scrollToSlide = (index: number) => {
    const container = swipeRef.current;
    const slide = container?.children.item(index) as HTMLElement | null;

    if (!container || !slide) {
      return;
    }

    container.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="page">
      <main className="page__content pt-8 sm:pt-10">
        <section
          className="swipe"
          aria-label="Parcours d'introduction"
          ref={swipeRef}
        >
          {slides.map((slide, index) => {
            const TitleTag = index === 0 ? "h1" : "h2";

            return (
              <div className="swipe__slide" key={slide.title}>
                <div className="swipe__media">
                  <Image
                    src="/adaptive-icon.png"
                    alt="Illustration CheReh"
                    width={520}
                    height={520}
                    priority={index === 0}
                    className="h-auto w-full"
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TitleTag className={index === 0 ? "text-3xl" : "text-2xl"}>
                    {slide.title}
                  </TitleTag>
                  <p className="swipe__text text-base">{slide.description}</p>
                </div>
              </div>
            );
          })}
        </section>
        <div className="swipe__dots" role="tablist" aria-label="Slides">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={`swipe__dot${index === activeIndex ? " is-active" : ""}`}
              aria-label={`Aller au slide ${index + 1}`}
              aria-selected={index === activeIndex}
              role="tab"
              onClick={() => scrollToSlide(index)}
            />
          ))}
        </div>
      </main>
      <div className="page__actions page__content w-full flex flex-col gap-3">
        {!isInstalled && installPrompt && (
          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={handleInstallClick}
          >
            Installer l&apos;application
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => router.push(startHref)}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}

