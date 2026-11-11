import React, { useState, useEffect } from 'react';
import { autoTrimAndCenterProduct } from '../utils/imageProcessing.ts';

const normalizedCache = new Map<string, string>();

interface GourmetCutoutImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Componente inteligente que detecta produtos recortados e normaliza sua proporção
 * automaticamente para garantir que tenham exatamente o mesmo tamanho visual dos produtos circulares.
 */
export const GourmetCutoutImage: React.FC<GourmetCutoutImageProps> = ({ src, alt, className }) => {
  const [displaySrc, setDisplaySrc] = useState<string>(() => (src ? (normalizedCache.get(src) || src) : ''));

  useEffect(() => {
    if (!src || typeof src !== 'string') return;

    if (normalizedCache.has(src)) {
      setDisplaySrc(normalizedCache.get(src)!);
      return;
    }

    let isMounted = true;
    const isTransparent = src.startsWith('data:image/png') || src.startsWith('data:image/webp');

    if (isTransparent) {
      autoTrimAndCenterProduct(src, 0.02)
        .then((trimmed) => {
          if (isMounted && trimmed) {
            normalizedCache.set(src, trimmed);
            setDisplaySrc(trimmed);
          }
        })
        .catch(() => {
          // fallback silencioso para a imagem original
        });
    } else {
      setDisplaySrc(src);
    }

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src) return null;

  return (
    <img
      src={displaySrc || src}
      alt={alt}
      loading="lazy"
      className={className}
    />
  );
};
