"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { THEME_OPTIONS, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
    theme: ThemePreference;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
    return value !== null && THEME_OPTIONS.includes(value as ThemePreference);
}

function getSystemTheme() {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemePreference) {
    const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
    document.documentElement.dataset.theme = resolvedTheme;
    return resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemePreference>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const initialTheme = isThemePreference(savedTheme) ? savedTheme : "system";
        setThemeState(initialTheme);
        setResolvedTheme(applyTheme(initialTheme));
    }, []);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            setResolvedTheme(applyTheme(theme));
        };

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, [theme]);

    const setTheme = useCallback((nextTheme: ThemePreference) => {
        setThemeState(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        setResolvedTheme(applyTheme(nextTheme));
    }, []);

    const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const value = useContext(ThemeContext);
    if (!value) throw new Error("useTheme must be used within ThemeProvider");
    return value;
}
export type { ThemePreference };
