import re
import base64
import os
import sys

template_path = sys.argv[1]
shots_dir = sys.argv[2]
out_path = sys.argv[3]

with open(template_path, "r", encoding="utf-8") as f:
    html = f.read()

names = sorted(set(re.findall(r'data-shot="([^"]+)"', html)))
print("Found", len(names), "image refs:", names)

missing = []
for name in names:
    path = os.path.join(shots_dir, name + ".png")
    if not os.path.exists(path):
        missing.append(name)
        continue
    with open(path, "rb") as imgf:
        b64 = base64.b64encode(imgf.read()).decode("ascii")
    data_uri = "data:image/png;base64," + b64
    html = html.replace('data-shot="%s"' % name, 'src="%s"' % data_uri)

if missing:
    print("MISSING FILES:", missing)
    sys.exit(1)

print("All images embedded successfully.")

with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Output size (MB):", os.path.getsize(out_path) / 1024 / 1024)
