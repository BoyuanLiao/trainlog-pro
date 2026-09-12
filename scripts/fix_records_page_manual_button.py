from pathlib import Path

index_path=Path('index.html')
app_path=Path('js/app.js')

index=index_path.read_text(encoding='utf-8')
old_records='    <div class="section"><span>訓練紀錄</span><button class="btn small primary" id="manualFromRecords">＋ 補登</button></div>'
new_records='    <div class="section">訓練紀錄</div>'
if index.count(old_records)!=1:
    raise SystemExit(f'expected exactly one records-page manual button, found {index.count(old_records)}')
index=index.replace(old_records,new_records,1)
index_path.write_text(index,encoding='utf-8')

app=app_path.read_text(encoding='utf-8')
tutorial="  {selector:'#manualFromRecords',title:'手動補登',copy:'忘記當場記錄時，可以用「補登」把一整場訓練補回來。'}\n"
if app.count(tutorial)!=1:
    raise SystemExit(f'expected exactly one records tutorial entry, found {app.count(tutorial)}')
app=app.replace(tutorial,'',1)

old_binding="$('#quickStart').onclick=()=>data.activeWorkout?goPage('trainPage'):openStartModal();$('#quickManual').onclick=manualEntry;$('#manualFromRecords').onclick=manualEntry;"
new_binding="$('#quickStart').onclick=()=>data.activeWorkout?goPage('trainPage'):openStartModal();$('#quickManual').onclick=manualEntry;"
if app.count(old_binding)!=1:
    raise SystemExit(f'expected exactly one records manual-entry binding, found {app.count(old_binding)}')
app=app.replace(old_binding,new_binding,1)
app_path.write_text(app,encoding='utf-8')

print('removed duplicate records-page manual-entry button while preserving quickManual')
