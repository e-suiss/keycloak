import type { Decorator, Preview } from "@storybook/react";
import { useLayoutEffect } from "react";
import "../src/globals.css";

/** Pins the theme from the toolbar; "system" leaves it to prefers-color-scheme. */
const withTheme: Decorator = (Story, context) => {
    const theme = context.globals.theme as "system" | "light" | "dark";

    useLayoutEffect(() => {
        const root = document.documentElement;
        if (theme === "system") {
            delete root.dataset.theme;
            root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
        } else {
            root.dataset.theme = theme;
            root.classList.toggle("dark", theme === "dark");
        }
    }, [theme]);

    return <Story />;
};

const preview: Preview = {
    globalTypes: {
        theme: {
            description: "Açık / koyu mod",
            toolbar: {
                title: "Tema",
                icon: "mirror",
                items: [
                    { value: "system", title: "Sistem" },
                    { value: "light", icon: "sun", title: "Açık" },
                    { value: "dark", icon: "moon", title: "Koyu" }
                ],
                dynamicTitle: true
            }
        }
    },
    initialGlobals: {
        theme: "light"
    },
    decorators: [withTheme],
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i
            }
        }
    }
};

export default preview;
