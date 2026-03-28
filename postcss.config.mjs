export default (ctx) => ({
    plugins: {
        ...(ctx.file && ctx.file.endsWith('.module.css') ? {} : { '@tailwindcss/postcss': {} }),
    },
});
