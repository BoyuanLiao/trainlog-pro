/**
 * TrainLog Pro persistence core.
 * Owns LocalStorage load/recovery plus snapshot/save behavior.
 * No DOM access; migration and render callbacks are injected.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const appKey = options.appKey || 'trainlogProData';
    const legacyKey = options.legacyKey || 'fitnessRecordsV1';
    const storage = options.storage;
    const migrate = options.migrate;
    const freshData = options.freshData;
    const uid = options.uid;
    const now = typeof options.now === 'function' ? options.now : () => new Date();

    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('TrainLogStorage.create requires a storage adapter');
    }
    if (typeof migrate !== 'function' || typeof freshData !== 'function' || typeof uid !== 'function') {
      throw new Error('TrainLogStorage.create missing required dependency');
    }

    function loadData() {
      let recoveryIssue = null;
      const cur = storage.getItem(appKey);
      if (cur) {
        try {
          return { data: migrate(JSON.parse(cur)), recoveryIssue };
        } catch (err) {
          try {
            const recoveryKey = appKey + '_recovery_latest';
            storage.setItem(recoveryKey, cur);
            recoveryIssue = {key:recoveryKey,raw:cur,at:now().toISOString(),message:String(err?.message||err||'JSON parse error')};
          } catch {
            recoveryIssue = {key:'',raw:cur,at:now().toISOString(),message:String(err?.message||err||'JSON parse error')};
          }
          return { data: freshData(), recoveryIssue };
        }
      }
      try {
        const legacy = storage.getItem(legacyKey);
        if (legacy) {
          const data = migrate({schemaVersion:1,records:JSON.parse(legacy)});
          storage.setItem(appKey, JSON.stringify(data));
          return { data, recoveryIssue };
        }
      } catch {
        try { storage.setItem(legacyKey + '_recovery_latest', storage.getItem(legacyKey) || ''); } catch {}
      }
      return { data: freshData(), recoveryIssue };
    }

    function snapshot(data, reason) {
      const copy = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'snapshots'))));
      const snaps = (data.snapshots || []).filter(s => s && s.payload);
      snaps.unshift({id:uid('snap'),at:now().toISOString(),reason,payload:copy});
      data.snapshots = snaps.slice(0,5);
      return data.snapshots[0];
    }

    function save(data, reason = '', takeSnapshot = false, render) {
      if (takeSnapshot) snapshot(data, reason || '自動快照');
      storage.setItem(appKey, JSON.stringify(data));
      if (typeof render === 'function') render();
    }

    return Object.freeze({ loadData, snapshot, save });
  }

  window.TrainLogStorage = Object.freeze({ create });
})();
