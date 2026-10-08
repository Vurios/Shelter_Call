"""Original deterministic app PNGs. Standard-library rasterizer, no downloaded art."""
from pathlib import Path
import struct
import zlib

COLORS = [(16, 29, 42), (255, 242, 213), (237, 185, 111), (130, 151, 164)]


def pixel(x, y):
    # Artwork stays within the central 80% maskable safe circle.
    color = 0
    if 22 < x < 78 and 47 < y < 72 or ((x - 50) / 28) ** 2 + ((y - 47) / 25) ** 2 < 1 and y < 47:
        color = 1
    if 43 < x < 57 and 54 < y < 73 or (x - 50) ** 2 + (y - 54) ** 2 < 49:
        color = 2
    if (x - 33) ** 2 + (y - 48) ** 2 < 13 or (x - 67) ** 2 + (y - 48) ** 2 < 13:
        color = 2
    if 19 < x < 81 and 75 < y < 77:
        color = 3
    if abs(x - 69) + abs(y - 20) < 3:
        color = 2
    return COLORS[color]


def chunk(name, data):
    return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data))


for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (512, 'icon-maskable.png')]:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            # Four samples smooth silhouettes, without a raster dependency.
            samples = [pixel((x + dx) * 100 / size, (y + dy) * 100 / size) for dx, dy in [(0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)]]
            raw.extend(round(sum(p[i] for p in samples) / 4) for i in range(3))
    header = struct.pack('>2I5B', size, size, 8, 2, 0, 0, 0)
    Path('public/assets').mkdir(parents=True, exist_ok=True)
    Path('public/assets', name).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))
