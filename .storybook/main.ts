import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: ["@storybook/addon-toolbars"],
    framework: {
        name: "@storybook/react-vite",
        options: {}
    },
    staticDirs: ["../public"],
    async viteFinal(config) {
        // Storybook uses its own Vite config, so the Tailwind plugin must be added
        // here too — otherwise src/globals.css isn't compiled and the
        // stories render unstyled.
        config.plugins = config.plugins ?? [];
        config.plugins.push(tailwindcss());
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
            ...(config.resolve.alias as Record<string, string> | undefined),
            "@ui": fileURLToPath(new URL("../src/ui", import.meta.url))
        };
        return config;
    }
};
export default config;
