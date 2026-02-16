"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import WordPopup from "./WordPopup";

interface ClickableJapaneseProps {
  text: string;
  segmentId: string;
}

interface ClickedWord {
  word: string;
  rect: DOMRect;
}

export default function ClickableJapanese({ text, segmentId }: ClickableJapaneseProps) {
  const [clicked, setClicked] = useState<ClickedWord | null>(null);

  const tokens = useMemo(() => {
    const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    return Array.from(segmenter.segment(text));
  }, [text]);

  const handleClick = (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setClicked({ word, rect });
  };

  return (
    <div className="text-xl text-white leading-relaxed">
      {tokens.map((seg, i) =>
        seg.isWordLike ? (
          <span
            key={i}
            onClick={(e) => handleClick(seg.segment, e)}
            className="cursor-pointer hover:bg-blue-900/40 hover:text-blue-300 rounded px-[1px] transition-colors"
          >
            {seg.segment}
          </span>
        ) : (
          <span key={i}>{seg.segment}</span>
        )
      )}

      {clicked &&
        createPortal(
          <WordPopup
            word={clicked.word}
            segmentId={segmentId}
            contextSentence={text}
            anchorRect={clicked.rect}
            onClose={() => setClicked(null)}
          />,
          document.body
        )}
    </div>
  );
}
