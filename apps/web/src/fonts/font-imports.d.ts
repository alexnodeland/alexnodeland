// The typeface's files are imported for their public URL (Gatsby's webpack
// emits each one and hands back where it landed), so the document head can
// preload the two every page opens with. See src/lib/head.tsx.
declare module '*.woff2' {
  const url: string;
  export default url;
}
