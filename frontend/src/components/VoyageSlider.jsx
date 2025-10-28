import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './VoyageSlider.css';

// Math utilities
const wrap = (n, max) => (n + max) % max;
const lerp = (a, b, t) => a + (b - a) * t;

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  lerp(v, t) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
  }
}

const VoyageSlider = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);
  const rafIdRef = useRef(null);
  const totalSlides = slides.length;


  // Get data attributes based on position relative to current
  const getDataAttr = (index) => {
    const current = currentIndex;
    const previous = wrap(currentIndex - 1, totalSlides);
    const next = wrap(currentIndex + 1, totalSlides);

    if (index === current) return 'current';
    if (index === previous) return 'previous';
    if (index === next) return 'next';
    return null;
  };

  // Navigation handlers
  const goToPrevious = () => {
    setCurrentIndex((prev) => wrap(prev - 1, totalSlides));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => wrap(prev + 1, totalSlides));
  };

  // Tilt effect
  useEffect(() => {
    if (!sliderRef.current) return;

    const slideElements = sliderRef.current.querySelectorAll('.slide');
    const slideInfoElements = sliderRef.current.querySelectorAll('.slide-info');

    if (!slideElements.length) return;

    const lerpAmount = { value: 0.06 };
    const instances = [];

    slideElements.forEach((slideEl, i) => {
      const slideInner = slideEl.querySelector('.slide__inner');
      const slideInfoInner = slideInfoElements[i]?.querySelector('.slide-info__inner');

      const rotDeg = { current: new Vec2(), target: new Vec2() };
      const bgPos = { current: new Vec2(), target: new Vec2() };

      const onMouseMove = (e) => {
        lerpAmount.value = 0.1;
        const rect = slideEl.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const ox = (offsetX - slideEl.clientWidth * 0.5) / (Math.PI * 3);
        const oy = -(offsetY - slideEl.clientHeight * 0.5) / (Math.PI * 4);

        rotDeg.target.set(ox, oy);
        bgPos.target.set(-ox * 0.3, oy * 0.3);
      };

      const onMouseLeave = () => {
        lerpAmount.value = 0.06;
        rotDeg.target.set(0, 0);
        bgPos.target.set(0, 0);
      };

      slideEl.addEventListener('mousemove', onMouseMove);
      slideEl.addEventListener('mouseleave', onMouseLeave);

      const animate = () => {
        rotDeg.current.lerp(rotDeg.target, lerpAmount.value);
        bgPos.current.lerp(bgPos.target, lerpAmount.value);

        if (slideInner) {
          slideInner.style.setProperty('--rotX', rotDeg.current.y.toFixed(2) + 'deg');
          slideInner.style.setProperty('--rotY', rotDeg.current.x.toFixed(2) + 'deg');
          slideInner.style.setProperty('--bgPosX', bgPos.current.x.toFixed(2) + '%');
          slideInner.style.setProperty('--bgPosY', bgPos.current.y.toFixed(2) + '%');
        }

        if (slideInfoInner) {
          slideInfoInner.style.setProperty('--rotX', rotDeg.current.y.toFixed(2) + 'deg');
          slideInfoInner.style.setProperty('--rotY', rotDeg.current.x.toFixed(2) + 'deg');
        }
      };

      instances.push({
        animate,
        cleanup: () => {
          slideEl.removeEventListener('mousemove', onMouseMove);
          slideEl.removeEventListener('mouseleave', onMouseLeave);
        }
      });
    });

    const raf = () => {
      instances.forEach(instance => instance.animate());
      rafIdRef.current = requestAnimationFrame(raf);
    };
    raf();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      instances.forEach(instance => instance.cleanup());
    };
  }, []);

  return (
    <div className="slider" ref={sliderRef}>
      <button className="slider--btn slider--btn__prev" onClick={goToPrevious}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="slides__wrapper">
        {/* Render ALL backgrounds */}
        {slides.map((slide, index) => {
          const dataAttr = getDataAttr(index);
          return (
            <div
              key={`bg-${index}`}
              className="slide__bg"
              {...(dataAttr && { [`data-${dataAttr}`]: '' })}
              style={{
                backgroundImage: slide.image
                  ? `url("${slide.image}")`
                  : `linear-gradient(135deg, ${slide.color}, #2c3e50)`
              }}
            ></div>
          );
        })}

        <div className="slides">
          {/* Render ALL slides */}
          {slides.map((slide, index) => {
            const dataAttr = getDataAttr(index);
            const zIndex = dataAttr === 'current' ? 20 : dataAttr === 'next' ? 30 : 10;

            return (
              <div
                key={index}
                className="slide"
                {...(dataAttr && { [`data-${dataAttr}`]: '' })}
                style={{ zIndex }}
              >
                <div className="slide__inner">
                  <div className="slide--image__wrapper">
                    {slide.image ? (
                      <img className="slide--image" src={slide.image} alt={slide.title} />
                    ) : (
                      <div className="slide--placeholder" style={{ background: `linear-gradient(135deg, ${slide.color}, #2c3e50)` }}>
                        <span className="slide--icon">{slide.icon}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="slides--infos">
          {/* Render ALL slide infos */}
          {slides.map((slide, index) => {
            const dataAttr = getDataAttr(index);

            return (
              <div
                key={index}
                className="slide-info"
                {...(dataAttr && { [`data-${dataAttr}`]: '' })}
              >
                <div className="slide-info__inner">
                  <div className="slide-info--text__wrapper">
                    <div data-title="true" className="slide-info--text">
                      <span>{slide.title}</span>
                    </div>
                    <div data-description="true" className="slide-info--text">
                      <span>{slide.description}</span>
                    </div>
                    <div className="slide-info--button-wrapper">
                      <Link to={`/events?category=${slide.categoryKey}`} className="slide-info--button">
                        Смотреть события
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="slider--btn slider--btn__next" onClick={goToNext}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default VoyageSlider;
