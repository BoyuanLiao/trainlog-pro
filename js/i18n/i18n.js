(() => {
  'use strict';

  const DEFAULT_LOCALE='zh-TW';
  let currentLocale=DEFAULT_LOCALE;

  function normalizeLocale(locale){
    const value=String(locale||'').trim();
    return window.TrainLogLocales?.[value]?value:DEFAULT_LOCALE;
  }
  function resolve(locale,key){
    let node=window.TrainLogLocales?.[normalizeLocale(locale)];
    for(const part of String(key||'').split('.')){
      if(!part||node==null||typeof node!=='object'||!(part in node))return undefined;
      node=node[part];
    }
    return typeof node==='string'?node:undefined;
  }
  function interpolate(value,vars={}){
    return String(value).replace(/\{([A-Za-z0-9_]+)\}/g,(match,key)=>
      Object.prototype.hasOwnProperty.call(vars,key)?String(vars[key]):match
    );
  }
  function t(key,vars={}){
    const value=resolve(currentLocale,key)??resolve(DEFAULT_LOCALE,key);
    return interpolate(value??String(key||''),vars);
  }
  function has(key,locale=currentLocale){return resolve(locale,key)!==undefined}
  function locale(){return currentLocale}
  function setLocale(next){
    currentLocale=normalizeLocale(next);
    if(typeof document!=='undefined'&&document.documentElement){
      document.documentElement.lang=currentLocale==='zh-TW'?'zh-Hant':currentLocale;
    }
    return currentLocale;
  }
  function apply(root=document){
    if(!root?.querySelectorAll)return;
    root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.setAttribute('placeholder',t(el.dataset.i18nPlaceholder))});
    root.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria))});
  }
  function formatDate(value,options={}){
    const date=value instanceof Date?value:new Date(value);
    return new Intl.DateTimeFormat(currentLocale,options).format(date);
  }
  function formatNumber(value,options={}){
    return new Intl.NumberFormat(currentLocale,options).format(Number(value)||0);
  }

  window.TrainLogI18n=Object.freeze({
    DEFAULT_LOCALE,normalizeLocale,t,has,locale,setLocale,apply,formatDate,formatNumber
  });
})();
