"""Fetch unmodified fonts and licenses from one pinned Google Fonts revision."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import urllib.request

REVISION = '2eb0b48d5f760f62e286216f0859a8c540dbc1bd'
FILES = [('atkinsonhyperlegible', 'AtkinsonHyperlegible-Regular.ttf'),
         ('atkinsonhyperlegible', 'AtkinsonHyperlegible-Bold.ttf'),
         ('patrickhand', 'PatrickHand-Regular.ttf'),
         ('atkinsonhyperlegible', 'OFL.txt'), ('patrickhand', 'OFL.txt')]


def download(entry):
    family, name = entry
    url = f'https://raw.githubusercontent.com/google/fonts/{REVISION}/ofl/{family}/{name}'
    dest = Path('public/assets/fonts', family + '-OFL.txt' if name == 'OFL.txt' else name)
    with urllib.request.urlopen(url, timeout=45) as response:
        data = response.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    print(dest.name, len(data), flush=True)


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(download, FILES))
