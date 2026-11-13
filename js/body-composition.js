/* OMRON HBF-702T 體組成 CSV 匯入與獨立資料管理。 */
(()=>{
	'use strict';
	const KEY='trainlogProBodyCompositionV1';
	const FIELDS=[
		['weightKg','體重(kg)'],['bodyFatPercent','體脂肪(%)'],
		['fatMassKg','體脂肪量(kg)'],['visceralFatLevel','內臟脂肪程度'],
		['basalMetabolismKcal','基礎代謝(kcal)'],['skeletalMusclePercent','骨骼肌(%)'],
		['skeletalMuscleKg','骨骼肌重量(kg)'],['armMusclePercent','骨骼肌率（雙臂）(%)'],
		['trunkMusclePercent','骨骼肌率（身軀）(%)'],['legMusclePercent','骨骼肌率（雙腳）(%)'],
		['subcutaneousFatPercent','皮下脂肪率(%)'],['armSubcutaneousFatPercent','皮下脂肪率（雙臂）(%)'],
		['trunkSubcutaneousFatPercent','皮下脂肪率（身軀）(%)'],['legSubcutaneousFatPercent','皮下脂肪率（雙腳）(%)'],
		['bmi','BMI'],['bodyAge','身體年齡(歲)']
	];
	const $=id=>document.getElementById(id);
	const number=v=>{
		const s=String(v??'').trim();
		if(!s||s==='-'||s==='--')return null;
		const n=Number(s);
		return Number.isFinite(n)?n:null;
	};
	const median=values=>{
		const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
		if(!a.length)return null;
		const p=Math.floor(a.length/2);
		return a.length%2?a[p]:(a[p-1]+a[p])/2;
	};
	const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
	const text=(id,value)=>{if($(id))$(id).textContent=value};
	const load=()=>{
		try{
			const result=JSON.parse(localStorage.getItem(KEY)||'[]');
			return Array.isArray(result)?result.filter(x=>x&&typeof x.measuredAt==='string'):[];
		}catch(e){return []}
	};
	const save=rows=>{
		localStorage.setItem(KEY,JSON.stringify(rows));
		// 獨立資料集，通知其他同分頁元件更新；不更動訓練資料。
		window.dispatchEvent(new CustomEvent('trainlog:body-composition-changed',{detail:{count:rows.length}}));
	};
	// RFC 4180 CSV：支援 UTF-8 BOM、引號、逗號及欄位換行。
	function parseCsv(source){
		const str=source.replace(/^\uFEFF/,'');
		const rows=[];let row=[],cell='',quoted=false;
		for(let i=0;i<str.length;i++){
			const c=str[i];
			if(quoted){
				if(c==='"'&&str[i+1]==='"'){cell+='"';i++}
				else if(c==='"')quoted=false;
				else cell+=c;
			}else if(c==='"'&&cell==='')quoted=true;
			else if(c===','){row.push(cell);cell=''}
			else if(c==='\n'||c==='\r'){
				if(c==='\r'&&str[i+1]==='\n')i++;
				row.push(cell);cell='';
				if(row.some(x=>x.trim()!==''))rows.push(row);
				row=[];
			}else cell+=c;
		}
		if(quoted)throw new Error('CSV 引號未正確結束');
		row.push(cell);
		if(row.some(x=>x.trim()!==''))rows.push(row);
		return rows;
	}
	function normalizeDate(date){
		const m=String(date||'').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
		if(!m)return null;
		const [y,mo,d,h,mi,s]=m.slice(1).map(Number);
		const dt=new Date(y,mo-1,d,h,mi,s||0);
		if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d||dt.getHours()!==h||dt.getMinutes()!==mi)return null;
		const pad=x=>String(x).padStart(2,'0');
		return y+'-'+pad(mo)+'-'+pad(d)+'T'+pad(h)+':'+pad(mi)+':'+pad(s||0);
	}
	function decode(textContent){
		const table=parseCsv(textContent);
		if(table.length<2)throw new Error('CSV 沒有有效資料列');
		const headers=table[0].map(s=>s.trim().replace(/^\uFEFF/,''));
		const dateIndex=headers.indexOf('測量日期');
		const weightIndex=headers.indexOf('體重(kg)');
		if(dateIndex<0||weightIndex<0)throw new Error('不是支援的 OMRON 體脂計 CSV：缺少「測量日期」或「體重(kg)」');
		const indices=FIELDS.map(([name,header])=>[name,headers.indexOf(header)]);
		const timezoneIndex=headers.indexOf('時區'),modelIndex=headers.indexOf('型號');
		const records=[];let invalid=0;
		for(const row of table.slice(1)){
			const at=normalizeDate(row[dateIndex]);
			const weight=number(row[weightIndex]);
			if(!at||weight===null||weight<20||weight>400){invalid++;continue}
			const item={measuredAt:at,timezone:timezoneIndex<0?'':row[timezoneIndex]||'',model:modelIndex<0?'':row[modelIndex]||''};
			for(const [name,index] of indices)item[name]=index<0?null:number(row[index]);
			// 部分 OMRON 匯出檔未提供脂肪重量或骨骼肌重量，以對應百分比推估並標記來源。
			if(item.fatMassKg===null&&item.bodyFatPercent!==null){
				item.fatMassKg=Math.round(item.weightKg*item.bodyFatPercent)/100;
				item.fatMassEstimated=true;
			}
			if(item.skeletalMuscleKg===null&&item.skeletalMusclePercent!==null){
				item.skeletalMuscleKg=Math.round(item.weightKg*item.skeletalMusclePercent)/100;
				item.skeletalMuscleMassEstimated=true;
			}
			records.push(item);
		}
		if(!records.length)throw new Error('找不到有效的測量紀錄');
		return{records,invalid,total:table.length-1};
	}
	function render(){
		const data=load().sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt));
		const latest=data.at(-1);
		text('bodyCount',data.length+' 筆');
		text('bodyLatest',latest?latest.measuredAt.slice(0,10):'—');
		text('bodyWeight',latest?fmt(latest.weightKg)+' kg':'—');
		text('bodyFat',latest?fmt(latest.bodyFatPercent)+'%':'—');
		text('bodyMuscle',latest?fmt(latest.skeletalMuscleKg)+' kg':'—');
		const list=$('bodyRecentList');
		if(list){
			list.replaceChildren();
			if(!data.length){list.textContent='尚無資料。前往「設定 → 資料與備份」匯入 OMRON CSV。';return}
			// 以月份中位數呈現，降低單日飲水與測量時間造成的波動。
			const months=new Map();
			for(const r of data){
				const month=r.measuredAt.slice(0,7);
				if(!months.has(month))months.set(month,[]);
				months.get(month).push(r);
			}
			const table=document.createElement('table');
			table.style.width='100%';table.style.fontSize='13px';table.style.borderCollapse='collapse';
			const head=document.createElement('thead'),tr=document.createElement('tr');
			for(const h of ['月份','筆數','體重中位數','體脂率中位數','骨骼肌重量中位數']){
				const th=document.createElement('th');th.textContent=h;th.style.padding='8px 4px';th.style.textAlign='left';tr.append(th);
			}
			head.append(tr);table.append(head);
			const tbody=document.createElement('tbody');
			for(const [month,rows] of [...months].reverse().slice(0,12)){
				const tr=document.createElement('tr');
				for(const value of [month,String(rows.length),fmt(median(rows.map(r=>r.weightKg)))+' kg',fmt(median(rows.map(r=>r.bodyFatPercent)))+'%',fmt(median(rows.map(r=>r.skeletalMuscleKg)))+' kg']){
					const td=document.createElement('td');td.textContent=value;td.style.padding='8px 4px';td.style.borderTop='1px solid var(--line, #444)';tr.append(td);
				}
				tbody.append(tr);
			}
			table.append(tbody);list.append(table);
		}
	}
	let pending=null;
	async function previewFile(event){
		const file=event.target.files?.[0];
		pending=null;
		const preview=$('bodyImportPreview');
		const confirm=$('bodyImportConfirm');
		confirm.disabled=true;
		if(!file)return;
		if(file.size>10*1024*1024){preview.textContent='檔案超過 10 MB，請分批匯入';return}
		try{
			// OMRON 匯出檔為 UTF-8；若存在舊 ANSI 匯出，顯示明確錯誤避免亂碼誤匯入。
			const parsed=decode(await file.text());
			const existing=new Set(load().map(x=>x.measuredAt));
			const unseen=new Map();
			for(const record of parsed.records){
				if(!existing.has(record.measuredAt))unseen.set(record.measuredAt,record);
			}
			pending=[...unseen.values()];
			preview.textContent='讀取 '+parsed.total+' 列；有效 '+parsed.records.length+' 筆；無效 '+parsed.invalid+' 列；可新增 '+pending.length+' 筆（相同測量時間自動略過）。\n僅新增體脂紀錄，不覆蓋訓練資料。';
			confirm.disabled=pending.length===0;
		}catch(error){preview.textContent='匯入解析失敗：'+error.message}
	}
	function commit(){
		if(!pending?.length)return;
		const map=new Map(load().map(r=>[r.measuredAt,r]));
		let added=0;
		for(const row of pending)if(!map.has(row.measuredAt)){map.set(row.measuredAt,row);added++}
		try{
			save([...map.values()].sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt)));
			text('bodyImportPreview','已新增 '+added+' 筆，重複資料未覆蓋。');
			pending=null;$('bodyImportConfirm').disabled=true;$('bodyImportFile').value='';
			render();
		}catch(e){text('bodyImportPreview','儲存失敗，可能是瀏覽器空間不足：'+e.message)}
	}
	function exportCsv(){
		const data=load().sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt));
		if(!data.length)return;
		const cols=[['measuredAt','測量日期'],['timezone','時區'],...FIELDS,['model','型號']];
		const escapeCell=v=>{
			const s=String(v??'');
			return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
		};
		const rows=[cols.map(c=>c[1]),...data.map(r=>cols.map(([k])=>k==='measuredAt'?r[k].replace('T',' ').slice(0,16).replace(/-/g,'/'):r[k]))];
		const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(escapeCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
		const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='trainlog-body-composition.csv';a.click();
		setTimeout(()=>URL.revokeObjectURL(url),1000);
	}
	function init(){
		if(!$('bodyImportFile'))return;
		$('bodyImportFile').addEventListener('change',previewFile);
		$('bodyImportConfirm').addEventListener('click',commit);
		$('bodyExportCsv').addEventListener('click',exportCsv);
		$('bodyClear').addEventListener('click',()=>{
			if(!load().length)return;
			if(!confirm('確定刪除全部體脂計紀錄？此操作不影響訓練資料，但無法復原，請先匯出備份。'))return;
			localStorage.removeItem(KEY);pending=null;render();text('bodyImportPreview','已刪除體脂計紀錄');
		});
		render();
	}
	if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
	else init();
	window.TrainLogBodyComposition={parseCsv,decode,load,render};
})();
