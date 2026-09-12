from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8')

css='<link rel="stylesheet" href="css/exercise-progress-browser.css?v=2.10.2">'
if css not in text:
    anchor='<link rel="stylesheet" href="css/app.css?v=2.10.2">'
    if anchor not in text: raise SystemExit('app css asset anchor not found')
    text=text.replace(anchor,anchor+'\n'+css,1)

script='<script src="js/ui/exercise-progress-browser.js?v=2.10.2"></script>'
if script not in text:
    anchor='<script src="js/training/progression-view.js?v=2.10.2"></script>'
    if anchor not in text: raise SystemExit('progression view script anchor not found')
    text=text.replace(anchor,anchor+'\n'+script,1)

p.write_text(text,encoding='utf-8')
