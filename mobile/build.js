// Builds the Clippit Android APK with the plain Android SDK tools (no Gradle, no downloads).
//   node mobile/build.js            build mobile/build/clippit.apk
//   node mobile/build.js --install  also install it on the connected device / emulator
//
// Needs: JDK 17+, and the Android SDK with platforms/android-34 and build-tools/34.0.0
// (set ANDROID_HOME, or it uses %LOCALAPPDATA%\Android\Sdk).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const src = path.join(__dirname, "android");
const out = path.join(__dirname, "build");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const BT = path.join(sdk, "build-tools", "34.0.0");
const androidJar = path.join(sdk, "platforms", "android-34", "android.jar");
const exe = process.platform === "win32" ? ".exe" : "";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${path.basename(cmd)} ${args.slice(0, 3).join(" ")} ...\n${r.stdout || ""}${r.stderr || ""}`);
    process.exit(1);
  }
  return r.stdout;
}
function walk(dir, ext, acc = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, ext, acc);
    else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

for (const p of [androidJar, path.join(BT, "aapt2" + exe)]) {
  if (!fs.existsSync(p)) { console.error("Missing Android SDK piece: " + p); process.exit(1); }
}

// 0. clean
fs.rmSync(out, { recursive: true, force: true });
for (const d of ["assets", "compiled", "gen", "classes", "dex", "res"]) fs.mkdirSync(path.join(out, d), { recursive: true });

// 1. assets = the web app, copied from site/
for (const f of fs.readdirSync(path.join(root, "site"))) {
  fs.copyFileSync(path.join(root, "site", f), path.join(out, "assets", f));
}

// 2. resources = our res/ plus the launcher icon made from the site icon
fs.cpSync(path.join(src, "res"), path.join(out, "res"), { recursive: true });
for (const d of ["mipmap-xxhdpi", "mipmap-xxxhdpi"]) {
  fs.mkdirSync(path.join(out, "res", d), { recursive: true });
  fs.copyFileSync(path.join(root, "site", "icon-192.png"), path.join(out, "res", d, "ic_launcher.png"));
}

// 3. compile + link resources (also generates R.java)
run(path.join(BT, "aapt2" + exe), ["compile", "--dir", path.join(out, "res"), "-o", path.join(out, "compiled", "res.zip")]);
const unsigned = path.join(out, "unsigned.apk");
run(path.join(BT, "aapt2" + exe), [
  "link", "-o", unsigned, "-I", androidJar,
  "--manifest", path.join(src, "AndroidManifest.xml"),
  "--min-sdk-version", "24", "--target-sdk-version", "34",
  "--version-code", "1", "--version-name", "0.1.0",
  "--java", path.join(out, "gen"),
  "-A", path.join(out, "assets"),
  path.join(out, "compiled", "res.zip"),
]);

// 4. compile Java
const javaFiles = [...walk(path.join(src, "src"), ".java"), ...walk(path.join(out, "gen"), ".java")];
run("javac", ["--release", "8", "-Xlint:-options", "-classpath", androidJar, "-d", path.join(out, "classes"), ...javaFiles]);

// 5. dex
const classFiles = walk(path.join(out, "classes"), ".class");
run("java", ["-cp", path.join(BT, "lib", "d8.jar"), "com.android.tools.r8.D8", "--lib", androidJar, "--min-api", "24", "--output", path.join(out, "dex"), ...classFiles]);

// 6. add classes.dex to the APK
run(path.join(BT, "aapt" + exe), ["add", unsigned, "classes.dex"], { cwd: path.join(out, "dex") });

// 7. align + sign (a throwaway debug key is created once and never committed)
const aligned = path.join(out, "aligned.apk");
run(path.join(BT, "zipalign" + exe), ["-f", "4", unsigned, aligned]);
const ks = path.join(__dirname, "debug.keystore");
if (!fs.existsSync(ks)) {
  run("keytool", ["-genkeypair", "-keystore", ks, "-storepass", "android", "-keypass", "android", "-alias", "clippit-debug",
    "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-dname", "CN=Clippit Debug,O=Clippit,C=IN"]);
}
const apk = path.join(out, "clippit.apk");
run("java", ["-jar", path.join(BT, "lib", "apksigner.jar"), "sign", "--ks", ks, "--ks-pass", "pass:android", "--key-pass", "pass:android",
  "--ks-key-alias", "clippit-debug", "--out", apk, aligned]);
run("java", ["-jar", path.join(BT, "lib", "apksigner.jar"), "verify", apk]);

console.log(`built ${path.relative(root, apk)} (${(fs.statSync(apk).size / 1024).toFixed(0)} KB)`);

if (process.argv.includes("--install")) {
  const adb = path.join(sdk, "platform-tools", "adb" + exe);
  console.log(run(adb, ["install", "-r", apk]).trim());
}
