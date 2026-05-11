"use client";

import { useRef, useEffect, useState, CSSProperties, ElementType } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: CSSProperties["textAlign"];
  tag?: ElementType;
  onLetterAnimationComplete?: () => void;
  scrub?: boolean;
  scrubSmooth?: number;
  startDelay?: number;
}

interface SplitHTMLElement extends HTMLElement {
  _rbsplitInstance?: InstanceType<typeof GSAPSplitText> | null;
}

const SplitText = ({
  text,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { y: 300 },
  to = { y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  tag: Tag = "p",
  onLetterAnimationComplete,
  scrub = true,
  scrubSmooth = 1,
  startDelay = 0,
}: SplitTextProps) => {
  const ref = useRef<SplitHTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts.status === "loaded") {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => setFontsLoaded(true));
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      if (animationCompletedRef.current && !scrub) return;

      const el = ref.current;

      if (el._rbsplitInstance) {
        try { el._rbsplitInstance.revert(); } catch (_) { /* ignore */ }
        el._rbsplitInstance = null;
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] ?? "px" : "px";
      const sign =
        marginValue === 0
          ? ""
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      let targets: Element[] | undefined;
      const assignTargets = (self: InstanceType<typeof GSAPSplitText>) => {
        if (splitType.includes("chars") && self.chars.length) targets = self.chars;
        if (!targets && splitType.includes("words") && self.words.length) targets = self.words;
        if (!targets && splitType.includes("lines") && self.lines.length) targets = self.lines;
        if (!targets) targets = self.chars ?? self.words ?? self.lines;
      };

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
        reduceWhiteSpace: false,
        onSplit: (self: InstanceType<typeof GSAPSplitText>) => {
          assignTargets(self);
          return gsap.fromTo(
            targets!,
            { ...from },
            {
              ...to,
              duration,
              ease,
              delay: startDelay,
              stagger: delay / 500,
              scrollTrigger: {
                trigger: el,
                start,
                end: scrub ? "bottom 20%" : undefined,
                scrub: scrub ? scrubSmooth : false,
                once: !scrub,
                fastScrollEnd: !scrub,
                anticipatePin: 0.4,
              },
              onComplete: () => {
                animationCompletedRef.current = true;
                onCompleteRef.current?.();
              },
              willChange: "transform",
              force3D: true,
            }
          );
        },
      });

      el._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill();
        });
        try { splitInstance.revert(); } catch (_) { /* ignore */ }
        el._rbsplitInstance = null;
      };
    },
    {
      dependencies: [
        text, delay, duration, ease, splitType,
        JSON.stringify(from), JSON.stringify(to),
        threshold, rootMargin, fontsLoaded, scrub, scrubSmooth, startDelay,
      ],
      scope: ref,
    }
  );

  const style: CSSProperties = {
    textAlign,
    wordWrap: "break-word",
    willChange: "transform",
  };
  const classes = `split-parent overflow-hidden inline-block whitespace-normal ${className}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TagComponent = Tag as any;
  return (
    <TagComponent ref={ref} style={style} className={classes}>
      {text}
    </TagComponent>
  );
};

export default SplitText;
