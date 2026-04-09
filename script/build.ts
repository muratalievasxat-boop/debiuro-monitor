import { build as esbuildBuild } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBuild() {
  console.log("Building Express server...");
  await esbuildBuild({
    entryPoints: [resolve(__dirname, "../server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: resolve(__dirname, "../dist/index.cjs"),
    packages: "external",
  });

  console.log("Build complete!");
}

runBuild().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
