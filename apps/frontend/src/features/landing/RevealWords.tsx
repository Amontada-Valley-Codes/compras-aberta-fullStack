import type { CSSProperties } from "react";

// Quebra o texto em palavras para o título surgir palavra por palavra quando
// o elemento pai com data-reveal="words" fica visível. O texto completo
// continua no DOM, então leitores de tela leem a frase normalmente.
export function RevealWords({ text }: { text: string }) {
  return text.split(" ").map((word, index, words) => (
    <span key={`${word}-${index}`}>
      <span className="reveal-word" style={{ "--w": index } as CSSProperties}>
        {word}
      </span>
      {index < words.length - 1 && " "}
    </span>
  ));
}
