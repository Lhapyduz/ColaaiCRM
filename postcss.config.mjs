const postcssConfig = (ctx) => ({
    plugins: {
        ...(ctx.file && ctx.file.endsWith('.module.css') ? {} : { '@tailwindcss/postcss': {} }),
    },
});

export default postcssConfig;