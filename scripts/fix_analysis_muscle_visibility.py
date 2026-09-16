from pathlib import Path
import re

index_path=Path('index.html')
app_path=Path('js/app.js')
index=index_path.read_text(encoding='utf-8')
app=app_path.read_text(encoding='utf-8')

match=re.search(r'(<div class="analysis-panel hidden" data-analysis-panel="muscle">)([\s\S]*?)(<div class="analysis-panel hidden" data-analysis-panel="exercise">)',index)
if not match:
    raise SystemExit('muscle analysis panel not found')

panel=match.group(2)
panel=panel.replace(' class="section ui-standard-only"',' class="section"')
panel=panel.replace(' class="card ui-standard-only"',' class="card"')
panel=panel.replace(' class="section ui-advanced-only"',' class="section"')
panel=panel.replace(' class="card ui-advanced-only"',' class="card"')

if 'ui-standard-only' in panel or 'ui-advanced-only' in panel:
    raise SystemExit('ui-level visibility class still present in muscle panel')

index=index[:match.start(2)]+panel+index[match.end(2):]
index=index.replace('?v=2.10.4','?v=2.10.5')
index=index.replace('TrainLog Pro v2.10.4','TrainLog Pro v2.10.5')
index=index.replace('<span class="source-pill">v2.10.4</span>','<span class="source-pill">v2.10.5</span>')
app=app.replace("const APP_VERSION='2.10.4';","const APP_VERSION='2.10.5';")

if "const APP_VERSION='2.10.5';" not in app:
    raise SystemExit('APP_VERSION bump failed')
if '?v=2.10.4' in index:
    raise SystemExit('stale 2.10.4 asset cache key remains')

index_path.write_text(index,encoding='utf-8')
app_path.write_text(app,encoding='utf-8')
