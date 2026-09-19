# TrainLog Pro automated tests

The permanent entry point is:

```bash
node tests/run-all.js
```

Every `*.test.js` file under `tests/` is discovered recursively and executed in an isolated Node process, so one test cannot leak globals into another.

## Coverage layers

- **Core** — schema migration, LocalStorage recovery/snapshot/save behavior, date/weight/number utilities.
- **Analysis** — effort distribution, confidence, muscle stimulus direct/indirect/total/source aggregation, movement patterns, consistency, progress signals and plateau detection.
- **Training** — metrics, workout lifecycle, set mutations, progression engine, progression presentation and recommendation application.
- **Data integrity** — unique IDs and valid references across equipment, exercises, alternatives and all system-program items.
- **Integration** — representative create → mutate → measure → finalize → history workout flow.
- **UI/static contracts** — records/analysis regressions, exercise progress browser, startup cache compatibility, unique DOM IDs, required mount points, local asset existence, script order and version/cache-key consistency.\n- **Real browser smoke** — a headless Chrome job serves the repository as a static site and verifies that startup JavaScript actually renders Home, Records and Analysis content.
- **Syntax / architecture** — all JavaScript files are parsed with `node --check`; pure modules are guarded against accidental DOM, LocalStorage or mutable app-state coupling.

GitHub Actions runs the complete suite on pushes to `main`, pull requests and manual dispatch through `.github/workflows/verify.yml`. Python maintenance scripts are compiled separately in the same workflow.
