import urllib.request
import json
import os

api_key = os.environ.get("STITCH_API_KEY", "")
if not api_key and os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("STITCH_API_KEY="):
                api_key = line.strip().split("=", 1)[1]
files = [
    'e099474eb62742818e557269db4c0ce4.json',
    'dc274d9afc2149329388d61e822a97b3.json',
    '6979e883cdf84168a245953dd345ac72.json',
    '544691547e044fd8a76bb88ac795eefb.json'
]

for fname in files:
    fpath = os.path.join(r'd:\proyectos\stitch_reference', fname)
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            html_obj = data.get('htmlCode')
            if html_obj and 'downloadUrl' in html_obj:
                d_url = html_obj['downloadUrl']
                print(f'Downloading HTML for {fname}...')
                try:
                    req = urllib.request.Request(d_url, headers={'X-Goog-Api-Key': api_key})
                    with urllib.request.urlopen(req) as res:
                        html_content = res.read().decode('utf-8')
                        out_html_path = os.path.join(r'd:\proyectos\stitch_reference', fname.replace('.json', '.html'))
                        with open(out_html_path, 'w', encoding='utf-8') as out_f:
                            out_f.write(html_content)
                        print(f'Saved {out_html_path} ({len(html_content)} bytes)')
                except Exception as e:
                    print(f'Error downloading {fname}: {e}')
