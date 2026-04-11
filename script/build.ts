import { build as viteBuild } from "vite";
import { build as esbuildBuild } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBuild() {
  if (process.env.SKIP_VITE_BUILD === "true") {
    console.log("Skipping Vite client build (SKIP_VITE_BUILD=true)...");
  } else {
    console.log("Building Vite client...");
    await viteBuild();
  }

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
