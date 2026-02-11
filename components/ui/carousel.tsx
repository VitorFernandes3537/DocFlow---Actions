"use client";

import { type ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselProps = {
  children: ReactNode;
};

export function Carousel({ children }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  function move(delta: number) {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="df-carousel">
      <div className="df-carousel-controls">
        <button
          type="button"
          className="df-carousel-btn"
          onClick={() => move(-260)}
          aria-label="Anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="df-carousel-btn"
          onClick={() => move(260)}
          aria-label="Proximo"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="df-carousel-track" ref={trackRef}>
        {children}
      </div>
    </div>
  );
}
