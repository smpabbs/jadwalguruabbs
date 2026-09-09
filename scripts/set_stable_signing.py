#!/usr/bin/env python3
# Stable signing untuk build APK CI (lihat .github/workflows/build-apk.yml).
# Menyuntik signingConfigs.debug + versionCode/versionName ke
# android/app/build.gradle hasil `npx cap add android`. Idempotent.
#
# Env yang dibaca:
#   KEYSTORE_FILE  - path absolut ke file keystore PKCS12 (decode dari secret)
#   KEYSTORE_PASS  - password keystore (secret)
#   VERSION_CODE   - angka versionCode (wajib naik monoton, mis. github.run_number)
#   VERSION_NAME   - versionName, mis. dari package.json
import os
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'android/app/build.gradle'
if not os.environ.get('KEYSTORE_PASS'):
    sys.exit('KEYSTORE_PASS env kosong')
vc = os.environ.get('VERSION_CODE', '').strip()
vn = os.environ.get('VERSION_NAME', '').strip()

with open(path, encoding='utf-8') as f:
    src = f.read()
orig = src

signing_block = (
    "    signingConfigs {\n"
    "        debug {\n"
    "            storeFile file(System.getenv('KEYSTORE_FILE'))\n"
    "            storePassword System.getenv('KEYSTORE_PASS')\n"
    "            keyAlias 'jadwalguru'\n"
    "            keyPassword System.getenv('KEYSTORE_PASS')\n"
    "        }\n"
    "    }\n"
)

# 1) sisipkan signingConfigs tepat setelah "android {"
if 'signingConfigs {' not in src:
    m = re.search(r'^android\s*\{', src, re.M)
    if not m:
        sys.exit('tidak menemukan blok "android {" di build.gradle')
    i = m.end()
    src = src[:i] + '\n' + signing_block + src[i:]

# 2) pastikan buildType debug memakai signingConfigs.debug.
#    Deteksi "debug {" HANYA di dalam wilayah buildTypes (bukan di signingConfigs).
bt = re.search(r'^(\s*)buildTypes\s*\{', src, re.M)
if bt:
    depth = 0
    i = bt.start()
    j = bt.end()
    region_end = len(src)
    while j < len(src):
        ch = src[j]
        if ch == '{':
            depth += 1
        elif ch == '}':
            if depth == 0:
                region_end = j
                break
            depth -= 1
        j += 1
    region = src[bt.end():region_end]
    if not re.search(r'^\s*debug\s*\{', region, re.M):
        indent = bt.group(1)
        ins = '\n' + indent + '    debug {\n' + indent + '        signingConfig signingConfigs.debug\n' + indent + '    }'
        src = src[:bt.end()] + ins + src[bt.end():]

# 3) versionCode (default template = 1)
if vc:
    src, n1 = re.subn(r'versionCode\s+\d+', 'versionCode ' + vc, src, count=1)
    if n1 == 0:
        sys.exit('tidak menemukan versionCode di build.gradle')
# 4) versionName (default template = "1.0")
if vn:
    src, n2 = re.subn(r'versionName\s+"[^"]*"', 'versionName "' + vn + '"', src, count=1)
    if n2 == 0:
        sys.exit('tidak menemukan versionName di build.gradle')

if src != orig:
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(src)
    print('OK: build.gradle di-patch (signing stabil + versionCode/versionName)')
else:
    print('build.gradle sudah sesuai, tanpa perubahan')

# info ringkas untuk log CI (tanpa nilai secret)
for line in src.splitlines():
    s = line.strip()
    if s.startswith('versionCode') or s.startswith('versionName') or s.startswith('keyAlias') or s.startswith('storeFile'):
        print('  ' + s)
