"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface SimplifiedColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose?: () => void;
  className?: string;
}

type HSVTuple = [number, number, number];

const CANVAS_SIZE = 180;
const RADIUS_OFFSET = 15;
const MIN_BRIGHTNESS = 85;
const SLIDER_MIN = 60;
const SLIDER_MAX = 100;
const HEX_REGEXP = /^#([0-9a-fA-F]{6})$/;
const SHORT_HEX_REGEXP = /^#([0-9a-fA-F]{3})$/;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isValidHex(hex: string): boolean {
  return HEX_REGEXP.test(hex);
}

function expandShortHex(hex: string): string {
  const match = SHORT_HEX_REGEXP.exec(hex);
  if (!match) {
    return hex;
  }
  const [r, g, b] = match[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function normalizeHex(hex: string): string {
  if (!hex) {
    return "#ffffff";
  }
  if (isValidHex(hex)) {
    return hex.toLowerCase();
  }
  if (SHORT_HEX_REGEXP.test(hex)) {
    return expandShortHex(hex).toLowerCase();
  }
  if (hex === "transparent") {
    return "#ffffff";
  }
  return "#ffffff";
}

function hexToHsv(hex: string): HSVTuple {
  const value = normalizeHex(hex).slice(1);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = max === 0 ? 0 : delta / max;
  const brightness = max;

  return [Math.round(hue), Math.round(saturation * 100), Math.round(brightness * 100)];
}

function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;

  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - chroma;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    [rPrime, gPrime, bPrime] = [chroma, x, 0];
  } else if (hue < 120) {
    [rPrime, gPrime, bPrime] = [x, chroma, 0];
  } else if (hue < 180) {
    [rPrime, gPrime, bPrime] = [0, chroma, x];
  } else if (hue < 240) {
    [rPrime, gPrime, bPrime] = [0, x, chroma];
  } else if (hue < 300) {
    [rPrime, gPrime, bPrime] = [x, 0, chroma];
  } else {
    [rPrime, gPrime, bPrime] = [chroma, 0, x];
  }

  const toHex = (component: number): string => {
    const channel = Math.round((component + m) * 255);
    return channel.toString(16).padStart(2, "0");
  };

  return `#${toHex(rPrime)}${toHex(gPrime)}${toHex(bPrime)}`;
}

export function SimplifiedColorPicker({
  value,
  onChange,
  onClose,
  className = "",
}: SimplifiedColorPickerProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const initialHex = normalizeHex(value);
  const [currentColor, setCurrentColor] = useState(initialHex);
  const [hsv, setHsv] = useState<HSVTuple>(() => hexToHsv(initialHex));

  useEffect(() => {
    const nextHex = normalizeHex(value);
    if (nextHex !== currentColor) {
      setCurrentColor(nextHex);
      setHsv(hexToHsv(nextHex));
    }
  }, [currentColor, value]);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - RADIUS_OFFSET;

    context.clearRect(0, 0, size, size);
    const brightnessForWheel = Math.max(MIN_BRIGHTNESS, hsv[2]);
    const segments = 72;

    for (let index = 0; index < segments; index += 1) {
      const angle = (index * 360) / segments;
      const startAngle = ((angle - 2.5) * Math.PI) / 180;
      const endAngle = ((angle + 2.5) * Math.PI) / 180;
      const gradient = context.createRadialGradient(center, center, 0, center, center, radius);

      gradient.addColorStop(0, hsvToHex(angle, 70, brightnessForWheel));
      gradient.addColorStop(0.6, hsvToHex(angle, 85, brightnessForWheel));
      gradient.addColorStop(1, hsvToHex(angle, 100, brightnessForWheel));

      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, startAngle, endAngle);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();

      context.strokeStyle = "rgba(255, 255, 255, 0.3)";
      context.lineWidth = 1;
      context.stroke();
    }

    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(0, 0, 0, 0.2)";
    context.lineWidth = 2;
    context.stroke();
  }, [hsv]);

  useEffect(() => {
    drawColorWheel();
  }, [drawColorWheel]);

  const handleWheelInteraction = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const center = rect.width / 2;
      const radius = center - RADIUS_OFFSET;
      const x = event.clientX - rect.left - center;
      const y = event.clientY - rect.top - center;
      const distance = Math.sqrt(x * x + y * y);

      if (distance > radius) {
        return;
      }

      let hue = (Math.atan2(y, x) * 180) / Math.PI;
      if (hue < 0) {
        hue += 360;
      }
      hue = (hue + 90) % 360;

      const saturation = Math.min(100, 70 + (distance / radius) * 30);
      const brightness = Math.max(MIN_BRIGHTNESS, hsv[2]);

      const nextHsv: HSVTuple = [hue, saturation, brightness];
      const nextHex = hsvToHex(...nextHsv);
      setHsv(nextHsv);
      setCurrentColor(nextHex);
      onChange(nextHex);
    },
    [hsv, onChange],
  );

  const sliderGradient = useMemo(() => {
    const minHex = hsvToHex(hsv[0], hsv[1], SLIDER_MIN);
    const maxHex = hsvToHex(hsv[0], hsv[1], SLIDER_MAX);
    return `linear-gradient(to right, ${minHex}, ${maxHex})`;
  }, [hsv]);

  const indicatorStyle = useMemo<CSSProperties>(() => {
    const center = CANVAS_SIZE / 2;
    const radius = center - RADIUS_OFFSET;
    const normalizedSaturation = clamp((hsv[1] - 70) / 30, 0, 1);
    const distance = normalizedSaturation * radius;
    const angle = ((hsv[0] - 90) * Math.PI) / 180;

    return {
      left: `${center + Math.cos(angle) * distance}px`,
      top: `${center + Math.sin(angle) * distance}px`,
      transform: "translate(-50%, -50%)",
    };
  }, [hsv]);

  return (
    <div
      className={`bg-white w-52 rounded-lg border border-gray-200 p-3 shadow-2xl ${className}`.trim()}
      role="dialog"
      aria-label="Color picker"
    >
      <div className="relative mb-3 flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="h-[180px] w-[180px] cursor-crosshair rounded-full border border-gray-200"
          onClick={handleWheelInteraction}
          onMouseMove={(event) => {
            if (isDraggingRef.current) {
              handleWheelInteraction(event);
            }
          }}
          onMouseDown={() => {
            isDraggingRef.current = true;
          }}
          onMouseUp={() => {
            isDraggingRef.current = false;
          }}
          onMouseLeave={() => {
            isDraggingRef.current = false;
          }}
        />

        <div className="absolute pointer-events-none" style={indicatorStyle}>
          <div className="h-5 w-5 rounded-full border-[3px] border-white bg-white/20 shadow-xl">
            <div
              className="h-full w-full rounded-full border-2 border-gray-900"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="relative">
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            value={hsv[2]}
            onChange={(event) => {
              const brightness = Number.parseInt(event.target.value, 10);
              const nextHsv: HSVTuple = [hsv[0], hsv[1], brightness];
              const nextHex = hsvToHex(...nextHsv);
              setHsv(nextHsv);
              setCurrentColor(nextHex);
              onChange(nextHex);
            }}
            className="h-3 w-full cursor-pointer appearance-none rounded-full border border-gray-300"
            style={{ background: sliderGradient }}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="h-8 w-12 rounded-lg border-2 border-gray-400 shadow-md"
          style={{ backgroundColor: currentColor }}
          aria-label="Selected color preview"
        />
      </div>
    </div>
  );
}
