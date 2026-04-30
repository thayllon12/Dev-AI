import React, { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

export const StreamedMessageBubble = ({ 
  streamedText, 
  userSettings, 
  isStreamFinished, 
  onAnimationComplete,
  isCodeMode,
  themeColor
}: any) => {
  const [displayedText, setDisplayedText] = useState("");
  const streamedTextRef = useRef(streamedText);
  const currentIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(performance.now());
  const lastRenderTimeRef = useRef(0);
  const accumulatedCharsRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    streamedTextRef.current = streamedText;
  }, [streamedText]);

  useEffect(() => {
    // Only init audio once
    if (userSettings.typingSound && !audioContextRef.current) {
      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          audioContextRef.current = new AudioCtor();
        }
      } catch (e) {}
    }
  }, [userSettings.typingSound]);

  useEffect(() => {
    if (!userSettings.typingEffect) {
      setDisplayedText(streamedText);
      if (isStreamFinished) {
        onAnimationComplete(streamedText);
      }
      return;
    }

    let codeBlockCount = 0;
    let lastCheckedIndex = 0;

    const playTick = () => {
      if (userSettings.typingSound && audioContextRef.current) {
        try {
          const ctx = audioContextRef.current;
          if (ctx.state === "suspended") {
            ctx.resume();
          }
          if (ctx.state === "running") {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            // A more mechanical click sound
            osc.type = "square";
            osc.frequency.setValueAtTime(150 + Math.random() * 50, ctx.currentTime);
            
            gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
            
            const filter = ctx.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.value = 1500;

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.02);
          }
        } catch (e) {}
      }
      if (userSettings.vibration && navigator.vibrate) {
        try { navigator.vibrate(3); } catch(e) {}
      }
    };

    const animate = (time: number) => {
      const deltaMs = Math.min(time - (lastUpdateRef.current || time), 100);
      lastUpdateRef.current = time;

      if (currentIndexRef.current < streamedTextRef.current.length) {
        if (currentIndexRef.current > lastCheckedIndex) {
            const newText = streamedTextRef.current.slice(lastCheckedIndex, currentIndexRef.current);
            const newMatches = newText.split('```').length - 1;
            codeBlockCount += newMatches;
            lastCheckedIndex = currentIndexRef.current;
        }
        
        const isInCodeBlock = codeBlockCount % 2 !== 0;

        const backlog = streamedTextRef.current.length - currentIndexRef.current;
        let speedCps = isInCodeBlock ? 8000 : 30; // 30 cps is roughly 5-6 words/second
        
        if (backlog > 40) {
            // gracefully speed up if falling behind, but don't instantly jump
            speedCps += backlog * 5;
        }

        const charsToProcess = (speedCps * deltaMs) / 1000;
        accumulatedCharsRef.current += charsToProcess;

        if (accumulatedCharsRef.current >= 1 || isInCodeBlock) {
          let advance = Math.max(1, Math.floor(accumulatedCharsRef.current));
          
          if (isInCodeBlock) {
             // within codeblock, type extremely fast
             advance = Math.max(advance, Math.min(800, backlog));
          }
          
          accumulatedCharsRef.current -= advance;
          if (accumulatedCharsRef.current < 0) accumulatedCharsRef.current = 0;

          currentIndexRef.current += advance;
          if (currentIndexRef.current > streamedTextRef.current.length) {
            currentIndexRef.current = streamedTextRef.current.length;
          }

          const now = Date.now();
          const throttleTime = streamedTextRef.current.length > 3000 ? 500 : (streamedTextRef.current.length > 1000 ? 200 : 50);
          if (now - lastRenderTimeRef.current > throttleTime || currentIndexRef.current === streamedTextRef.current.length) {
             lastRenderTimeRef.current = now;
             const nextText = streamedTextRef.current.slice(0, currentIndexRef.current);
             setDisplayedText(nextText);
          }

          // Haptics/sound frequency adapts to speed
          if (Math.random() > (isInCodeBlock ? 0.9 : 0.3)) {
             playTick();
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (isStreamFinished) {
           onAnimationComplete(streamedTextRef.current);
        } else {
           animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isStreamFinished, userSettings.typingEffect, userSettings.typingSound, userSettings.vibration]);

  // Fix unclosed code blocks so they render nicely while streaming
  let textToDisplay = displayedText;
  const openBlocks = textToDisplay.split('```').length - 1;
  if (openBlocks % 2 !== 0) {
    textToDisplay += "\n```";
  }

  return (
    <div className="relative w-full min-w-0">
      <MessageBubble 
        msg={{ role: "model", content: textToDisplay + (currentIndexRef.current < streamedTextRef.current.length || !isStreamFinished ? " ▋" : ""), isGenerating: true }} 
        isCodeMode={isCodeMode} 
        themeColor={themeColor} 
        userSettings={userSettings} 
      />
    </div>
  );
};
