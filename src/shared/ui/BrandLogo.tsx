import type { ImgHTMLAttributes } from 'react';
import { useTheme } from '@/shared/ThemeContext';

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** Fixed dark banners need the white logo in either page theme. */
  onDark?: boolean;
};

export function BrandLogo({ onDark = false, alt = 'Logo Gaharu Sempana Group', ...props }: BrandLogoProps) {
  const { theme } = useTheme();
  return <img {...props} src={onDark || theme === 'dark' ? '/logo-gsg-dark.png' : '/logo-gsg-light.png'} alt={alt} />;
}
