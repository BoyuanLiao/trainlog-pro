from pathlib import Path
import runpy

index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
index=index.replace('?v=2.10.2','?v=2.10.3')
index_path.write_text(index,encoding='utf-8')

runpy.run_path('scripts/refactor_exercise_progress_browser_v3.py',run_name='__main__')
