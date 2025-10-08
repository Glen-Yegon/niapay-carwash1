// minify-all.js
import fs from "fs-extra";
import path from "path";
import { glob } from "glob"; // ✅ FIXED: use named import
import CleanCSS from "clean-css";
import { minify } from "terser";

const projectRoot = process.cwd();

async function minifyAll() {
  console.log("🧹 Cleaning old minified files...");
  const oldMinified = await glob(`${projectRoot}/**/*.min.{css,js}`, { nodir: true });
  for (const file of oldMinified) {
    await fs.remove(file);
    console.log(`❌ Deleted: ${file}`);
  }

  console.log("\n⚙️ Minifying all CSS and JS files...");

  // Minify CSS files
  const cssFiles = await glob(`${projectRoot}/**/*.css`, {
    nodir: true,
    ignore: ["**/*.min.css", "node_modules/**"],
  });

  for (const file of cssFiles) {
    const source = await fs.readFile(file, "utf8");
    const output = new CleanCSS().minify(source).styles;
    const minPath = file.replace(/\.css$/, ".min.css");
    await fs.outputFile(minPath, output);
    console.log(`✨ Minified CSS: ${path.relative(projectRoot, minPath)}`);
  }

  // Minify JS files
  const jsFiles = await glob(`${projectRoot}/**/*.js`, {
    nodir: true,
    ignore: ["**/*.min.js", "node_modules/**", "**/minify-all.js"],
  });

  for (const file of jsFiles) {
    const source = await fs.readFile(file, "utf8");
    const result = await minify(source);
    const minPath = file.replace(/\.js$/, ".min.js");
    await fs.outputFile(minPath, result.code);
    console.log(`⚡ Minified JS: ${path.relative(projectRoot, minPath)}`);
  }

  console.log("\n✅ Done! All files successfully minified.");
}

minifyAll().catch((err) => console.error("❌ Error:", err));
