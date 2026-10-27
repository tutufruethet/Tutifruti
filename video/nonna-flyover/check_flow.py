"""Optical-flow check of the 30fps preview: the glide never dips and the flight never zooms in.

    python check_flow.py preview-30fps.mp4
"""
import sys
import cv2
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else "preview-30fps.mp4"
cap = cv2.VideoCapture(path)
fps = cap.get(cv2.CAP_PROP_FPS) or 30
prev, rows, i = None, [], 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    g = cv2.cvtColor(cv2.resize(frame, (720, 576)), cv2.COLOR_BGR2GRAY)
    if prev is not None:
        flow = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 4, 31, 5, 7, 1.5, 0)
        band = flow[150:330, 120:600]  # middle of the frame, where the focus sits
        vy = -np.median(band[..., 1]) * 2  # page moving up the frame, in full-res px
        xs = np.arange(120, 600) - 360
        dx = np.median(band[..., 0], axis=0)
        zoom = np.polyfit(xs, dx, 1)[0]  # >0 means the picture is expanding (zoom in)
        rows.append((i / fps, vy, zoom))
    prev, i = g, i + 1

rows = np.array(rows)
flight = rows[rows[:, 0] < 8.2]
cruise = rows[(rows[:, 0] > 1.7) & (rows[:, 0] < 7.2)]
print(f"{len(rows)} frames  cruise speed median {np.median(cruise[:, 1]):.1f} px/frame")
# the distance eases out, so on screen the speed drifts down slowly; a dip is a local drop
v = cruise[:, 1]
trend = np.array([np.median(v[max(0, k - 8):k + 9]) for k in range(len(v))])
dips = cruise[v < trend * 0.85]
zin = flight[flight[:, 2] > 0.002]
for t, v, z in rows[::6]:
    print(f"t={t:5.2f}  speed {v:7.2f}  zoom {z:+.4f}")
print("dips in the glide:", "none" if len(dips) == 0 else ", ".join(f"{t:.2f}s" for t in dips[:, 0]))
print("zoom-in during the flight:", "none" if len(zin) == 0 else ", ".join(f"{t:.2f}s" for t in zin[:, 0]))
sys.exit(1 if len(dips) or len(zin) else 0)
