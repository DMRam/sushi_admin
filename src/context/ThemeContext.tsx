import { createContext, useContext, useState, type ReactNode } from "react";

export type Theme =
  | "minimal-japan"
  | "street-sushi"
  | "eco-sushi";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "minimal-japan",
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("minimal-japan");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme} transition-all duration-500`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
