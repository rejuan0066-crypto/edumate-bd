import { useEffect } from 'react';
import { useThemeSettings, ThemeSettings } from '@/hooks/useThemeSettings';

function applyTheme(t: ThemeSettings) {
  const root = document.documentElement;
  
  // Primary color
  root.style.setProperty('--primary', `${t.primaryHue} ${t.primarySaturation}% ${t.primaryLightness}%`);
  root.style.setProperty('--ring', `${t.primaryHue} ${t.primarySaturation}% ${t.primaryLightness}%`);
  
  // Accent color
  root.style.setProperty('--accent', `${t.accentHue} ${t.accentSaturation}% ${t.accentLightness}%`);
  
  // Background
  root.style.setProperty('--background', `${t.backgroundHue} ${t.backgroundSaturation}% ${t.backgroundLightness}%`);
  root.style.setProperty('--secondary', `${t.backgroundHue} 45% 92%`);
  root.style.setProperty('--muted', `${t.backgroundHue} 20% 94%`);
  root.style.setProperty('--border', `${t.backgroundHue} 20% 88%`);
  root.style.setProperty('--input', `${t.backgroundHue} 20% 88%`);

  // Sidebar
  root.style.setProperty('--sidebar-background', `${t.primaryHue} 35% ${t.sidebarDarkness}%`);
  root.style.setProperty('--sidebar-primary', `${t.accentHue} ${t.accentSaturation}% ${t.accentLightness}%`);
  root.style.setProperty('--sidebar-accent', `${t.primaryHue} 30% ${t.sidebarDarkness + 6}%`);
  root.style.setProperty('--sidebar-border', `${t.primaryHue} 25% ${t.sidebarDarkness + 8}%`);
  root.style.setProperty('--sidebar-ring', `${t.accentHue} ${t.accentSaturation}% ${t.accentLightness}%`);

  // Border radius
  root.style.setProperty('--radius', `${t.borderRadius / 16}rem`);

  // Fonts
  root.style.setProperty('--font-display', `"${t.fontDisplay}", "Noto Sans Bengali", serif`);
  root.style.setProperty('--font-body', `"${t.fontBody}", "Noto Sans Bengali", sans-serif`);
  document.body.style.fontFamily = `"${t.fontBody}", "Noto Sans Bengali", sans-serif`;

  // Success/warning/info derived from primary
  root.style.setProperty('--success', `${t.primaryHue} ${t.primarySaturation}% 40%`);
  root.style.setProperty('--warning', `${t.accentHue - 4} 92% 50%`);
  root.style.setProperty('--info', `210 80% 52%`);

  // Gradients
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${t.primaryHue} ${t.primarySaturation}% ${t.primaryLightness}%), hsl(${t.primaryHue} ${t.primarySaturation}% ${t.primaryLightness - 6}%))`);
  root.style.setProperty('--gradient-gold', `linear-gradient(135deg, hsl(${t.accentHue} ${t.accentSaturation}% ${t.accentLightness}%), hsl(${t.accentHue - 4} ${t.accentSaturation - 5}% ${t.accentLightness - 7}%))`);
  root.style.setProperty('--gradient-hero', `linear-gradient(135deg, hsl(${t.primaryHue} ${t.primarySaturation}% ${t.primaryLightness - 10}%), hsl(${t.primaryHue} ${t.primarySaturation + 5}% ${t.primaryLightness - 16}%))`);
}

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme, isLoading } = useThemeSettings();

  useEffect(() => {
    if (!isLoading) {
      applyTheme(theme);
    }
  }, [theme, isLoading]);

  return <>{children}</>;
};

export default ThemeProvider;
