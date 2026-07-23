import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const useLandingGSAP = () => {
  const scrollArrowRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLSpanElement>(null);
  const accentRef = useRef<HTMLElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  const cardsRef = useRef<HTMLDivElement[]>([]);
  const featuresTitleRef = useRef<HTMLHeadingElement>(null);
  const featuresSubtitleRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
      const cleanups: (() => void)[] = [];

      cardsRef.current = cardsRef.current.filter(Boolean);

      gsap.to(scrollArrowRef.current, {
        y: 8,
        duration: 0.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.fromTo(
        badgeRef.current,
        {
          y: -30,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
        },
      );

    if (titleRef.current) {
      const chars =
        titleRef.current.querySelectorAll<HTMLSpanElement>('[data-hero-char]');
      chars.forEach((char) => {
        char.style.opacity = '0';
      });
      tl.fromTo(
        titleRef.current,
        {
          opacity: 0,
        },
        { opacity: 1, duration: 0 },
      );
      tl.fromTo(
        chars,
        {
          y: '110%',
          duration: 0.5,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.015,
        },
        '-=0.5',
      );

      tl.fromTo(
        accentRef.current,
        {
          opacity: 0,
          scale: 0.6,
          filter: 'blur(10px)',
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: 'back.out(2.5)',
        },
        '-=0.15',
      );
    }

    tl.fromTo(
      subtitleRef.current,
      {
        clipPath: `inset(0 100% 0 0)`,
        opacity: 0,
      },
      {
        clipPath: `inset(0 0% 0 0)`,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.inOut',
      },
      '-=0.5',
    );

    if (buttonsRef.current) {
      tl.fromTo(
        buttonsRef.current,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0,
        },
      );
      tl.fromTo(
        buttonsRef.current.children,
        {
          scale: 0,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1)',
        },
        '-=0.3',
      );
    }

    gsap.fromTo(
      featuresTitleRef.current,
      {
        y: 40,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: featuresTitleRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      },
    );

    gsap.fromTo(
      featuresSubtitleRef.current,
      {
        y: 20,
        opacity: 0,
      },
      {
        scrollTrigger: {
          trigger: featuresSubtitleRef.current,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
      },
    );

    cardsRef.current.forEach((card, i) => {
      if (!card) return;

      gsap.set(card, {
        transformPerspective: 900,
        transformOrigin: 'left center',
      });

      gsap.fromTo(
        card,
        {
          rotateY: -55,
          x: -60,
          opacity: 0,
        },
        {
          scrollTrigger: {
            trigger: card,
            start: 'top 82%',
            toggleActions: 'play none none reverse',
          },
          rotateY: 0,
          x: 0,
          opacity: 1,
          duration: 0.85,
          delay: (i % 3) * 0.12,
          ease: 'power4.out',
        },
      );

      const onEnter = () => {
        gsap.to(card, {
          y: -10,
          scale: 1.03,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });

        gsap.to(card, {
          boxShadow: '0 20px 40px var(--taskflow-primary-glow)',
          duration: 0.05,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };

      const onLeave = () =>
        gsap.to(card, {
          y: 0,
          scale: 1,
          boxShadow: 'none',
          duration: 0.4,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });

      card.addEventListener('mouseenter', onEnter);
      card.addEventListener('mouseleave', onLeave);

      cleanups.push(() => {
        card.removeEventListener('mouseenter', onEnter);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  });

  return {
    scrollArrowRef,
    featuresRef,
    titleRef,
    accentRef,
    subtitleRef,
    badgeRef,
    buttonsRef,
    cardsRef,
    featuresTitleRef,
    featuresSubtitleRef,
  };
};
