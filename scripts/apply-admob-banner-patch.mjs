import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const vendor = path.join(
  root,
  "patches",
  "vendor-capacitor-admob-banner",
  "BannerExecutor.java",
);
const dest = path.join(
  root,
  "node_modules",
  "@capacitor-community",
  "admob",
  "android",
  "src",
  "main",
  "java",
  "com",
  "getcapacitor",
  "community",
  "admob",
  "banner",
  "BannerExecutor.java",
);

if (!fs.existsSync(vendor)) {
  console.warn("[admob-patch] patches/vendor-capacitor-admob-banner/BannerExecutor.java 없음 — 건너뜀");
  process.exit(0);
}
if (!fs.existsSync(path.dirname(dest))) {
  console.warn(
    "[admob-patch] @capacitor-community/admob 없음 — npm install 후 다시 시도",
  );
  process.exit(0);
}

fs.copyFileSync(vendor, dest);
console.log(
  "[admob-patch] BannerExecutor.java 적용됨 (Android 15+ 배너 슬롯 margin 유지)",
);
