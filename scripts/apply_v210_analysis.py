from pathlib import Path
import re

OLD='v2.9.24'
NEW='v2.10.0'

# Replace analysis-page layout while keeping all existing render target IDs.
index_p=Path('index.html')
index=index_p.read_text(encoding='utf-8')
new_section=Path('scripts/v210_analysis_section.html.txt').read_text(encoding='utf-8')
pattern=r'  <section class="page" id="analysisPage">.*?  </section>'
matches=re.findall(pattern,index,flags=re.S)
if len(matches)!=1:
    raise SystemExit(f'Expected exactly one analysisPage section, found {len(matches)}')
index=re.sub(pattern,new_section,index,count=1,flags=re.S)
if OLD not in index and NEW not in index:
    raise SystemExit('Current version marker not found')
index=index.replace(OLD,NEW)
index_p.write_text(index,encoding='utf-8')

# Insert new analysis helpers into the existing app IIFE so they can reuse the
# existing data model, progression logic, stimulus calculations and formatters.
app_p=Path('js/app.js')
app=app_p.read_text(encoding='utf-8')
helpers=Path('scripts/v210_helpers.js.txt').read_text(encoding='utf-8').rstrip()+'\n'
marker='// TrainLog Pro v2.10.0 analysis intelligence'
if marker not in app:
    pos=app.find('function renderAnalysis(){')
    if pos<0:
        raise SystemExit('renderAnalysis marker not found')
    app=app[:pos]+helpers+'\n'+app[pos:]
    old='function renderAnalysis(){'
    new="function renderAnalysis(){\n const __v210days=data.settings.analysisRange||30;renderV210Analysis(workoutsInRange(__v210days),__v210days);bindAnalysisTabs();"
    if old not in app:
        raise SystemExit('renderAnalysis injection point not found')
    app=app.replace(old,new,1)
app_p.write_text(app,encoding='utf-8')

# Append mobile-first styles once.
css_p=Path('css/app.css')
style=css_p.read_text(encoding='utf-8')
css_block=Path('scripts/v210_analysis.css.txt').read_text(encoding='utf-8').strip()
if 'TrainLog Pro v2.10.0 analysis navigation and insight cards' not in style:
    style=style.rstrip()+'\n'+css_block+'\n'
css_p.write_text(style,encoding='utf-8')

# Integrity checks: old analysis features must remain exactly once, and each
# new v2.10.0 destination/function must exist.
for ident in [
    'analysisHighlights','analysisKpis','muscleAnalysis','effortAnalysis','pplAnalysis',
    'consistencyAnalysis','analysisExercise','exerciseAnalysis','analysisLoadTrend',
    'analysisMuscleTargets','analysisMovementGaps','analysisProgressOpportunities','analysisPrTimeline'
]:
    count=index.count(f'id="{ident}"')
    if count!=1:
        raise SystemExit(f'Expected one #{ident}, found {count}')
for fn in [
    'renderAnalysisLoadTrend','renderAnalysisMuscleTargets','renderAnalysisMovementGaps',
    'renderAnalysisProgressOpportunities','renderAnalysisPrTimeline'
]:
    if f'function {fn}' not in app:
        raise SystemExit(f'Missing {fn}')
if NEW not in index:
    raise SystemExit('Version update failed')
print('v2.10.0 analysis patch applied')
