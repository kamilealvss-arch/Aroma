import React from 'react';
import ingredientsBasketImg from '../../assets/ingredients-basket.png';

interface IngredientsBasketIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const IngredientsBasketIcon: React.FC<IngredientsBasketIconProps> = ({
  className = 'w-3.5 h-3.5',
  style,
}) => {
  return (
    <span
      role="img"
      aria-label="Insumos"
      className={`inline-block shrink-0 transition-colors ${className}`}
      style={{
        maskImage: `url(${ingredientsBasketImg})`,
        WebkitMaskImage: `url(${ingredientsBasketImg})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
};
