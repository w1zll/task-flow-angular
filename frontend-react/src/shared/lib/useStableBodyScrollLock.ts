'use client';

import { useEffect } from 'react';

let lockCount = 0;
let scrollTop = 0;
let savedBodyStyles: Partial<CSSStyleDeclaration> = {};

export const useStableBodyScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    const body = document.body;

    if (lockCount === 0) {
      scrollTop = window.scrollY;
      savedBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        overflowY: body.style.overflowY,
        paddingRight: body.style.paddingRight,
      };

      body.style.position = 'fixed';
      body.style.top = `-${scrollTop}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.paddingRight = '0px';
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;

      body.style.position = savedBodyStyles.position ?? '';
      body.style.top = savedBodyStyles.top ?? '';
      body.style.left = savedBodyStyles.left ?? '';
      body.style.right = savedBodyStyles.right ?? '';
      body.style.width = savedBodyStyles.width ?? '';
      body.style.overflow = savedBodyStyles.overflow ?? '';
      body.style.overflowY = savedBodyStyles.overflowY ?? '';
      body.style.paddingRight = savedBodyStyles.paddingRight ?? '';
      window.scrollTo(0, scrollTop);
    };
  }, [locked]);
};
