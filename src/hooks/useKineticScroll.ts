import * as React from "react";
import { useEffect } from "react";

export function useKineticScroll(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX: number;
    let startY: number;
    let scrollLeft: number;
    let scrollTop: number;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A', 'SVG', 'PATH'].includes(target.tagName) || target.closest('button') || target.closest('a')) return;
      
      isDown = true;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
      startX = e.pageX - el.offsetLeft;
      startY = e.pageY - el.offsetTop;
      scrollLeft = el.scrollLeft;
      scrollTop = el.scrollTop;
    };

    const onMouseLeave = () => {
      isDown = false;
      el.style.cursor = 'default';
      el.style.removeProperty('user-select');
    };

    const onMouseUp = () => {
      isDown = false;
      el.style.cursor = 'default';
      el.style.removeProperty('user-select');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const y = e.pageY - el.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      el.scrollLeft = scrollLeft - walkX;
      el.scrollTop = scrollTop - walkY;
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, [ref]);
}
