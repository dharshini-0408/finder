import { useEffect, useRef } from "react";
import "./background.css";

export default function Background() {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    let frame = 0;

    function onPointerMove(event) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--spot-x", `${event.clientX}px`);
        element.style.setProperty("--spot-y", `${event.clientY}px`);
      });
    }

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div ref={ref} className="background" aria-hidden="true">
      <div className="background__grid" />
      <div className="background__spotlight" />
      <div className="background__grain" />
      <div className="background__vignette" />
    </div>
  );
}
