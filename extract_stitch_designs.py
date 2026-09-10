"""
Script para descargar e inspeccionar los diseños del proyecto de Stitch 'Glassmorphic Custom Apparel'.
"""

import urllib.request
import json
import os

API_KEY = os.environ.get("STITCH_API_KEY", "")
if not API_KEY and os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("STITCH_API_KEY="):
                API_KEY = line.strip().split("=", 1)[1]

PROJECT_ID = "13326850608578728203"
OUTPUT_DIR = r"d:\proyectos\stitch_reference"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Obtener lista de pantallas
url_screens = f"https://stitch.googleapis.com/v1/projects/{PROJECT_ID}/screens"
req = urllib.request.Request(url_screens, headers={"X-Goog-Api-Key": API_KEY})
with urllib.request.urlopen(req) as res:
    screens_list = json.loads(res.read()).get("screens", [])

print(f"Encontradas {len(screens_list)} pantallas en Stitch.")

for screen_meta in screens_list:
    s_id = screen_meta["name"].split("/")[-1]
    s_title = screen_meta.get("title", s_id)
    url_screen = f"https://stitch.googleapis.com/v1/projects/{PROJECT_ID}/screens/{s_id}"
    
    try:
        req_s = urllib.request.Request(url_screen, headers={"X-Goog-Api-Key": API_KEY})
        with urllib.request.urlopen(req_s) as res_s:
            screen_data = json.loads(res_s.read())
            
            # Guardar JSON completo
            json_path = os.path.join(OUTPUT_DIR, f"{s_id}.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(screen_data, f, indent=2, ensure_ascii=False)
                
            # Si contiene HTML, guardarlo
            if "html" in screen_data:
                html_path = os.path.join(OUTPUT_DIR, f"{s_id}.html")
                with open(html_path, "w", encoding="utf-8") as f:
                    f.write(screen_data["html"])
                print(f"-> Descargado HTML: {s_title} ({s_id}.html)")
            else:
                print(f"-> Descargado JSON: {s_title} ({s_id}.json)")
                
    except Exception as e:
        print(f"Error con pantalla {s_id}: {e}")

print("Descarga de referencias de Stitch completada.")
