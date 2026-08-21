import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const email=(process.env.TARGET_USER_EMAIL||'').trim().toLowerCase();
const legacy=process.env.LEGACY_DIR||path.resolve('legacy');
if(!url||!key||!email)throw new Error('Brakuje SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY lub TARGET_USER_EMAIL.');
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const text=v=>String(v??'').trim();
const number=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const iso=v=>{if(!v)return null;const d=v instanceof Date?v:new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
const baseOrder=v=>text(v).match(/^(\d+\/\d{4})/)?.[1]||text(v);
const classify=headers=>{const h=new Set(headers.map(text));if(['Numer zamówienia MyPrint','Ilość','Klient'].every(x=>h.has(x)))return'orders';if(['Wysłana ilość','Zamówienie','Dokument'].every(x=>h.has(x)))return'shipments';if(['KLIENT','NAKŁAD','BRAK','NADWYŻKA'].every(x=>h.has(x)))return'tolerances';return null};

async function userId(){for(let page=1;page<=100;page++){const {data,error}=await sb.auth.admin.listUsers({page,perPage:1000});if(error)throw error;const user=data.users.find(x=>x.email?.toLowerCase()===email);if(user)return user.id;if(data.users.length<1000)break}throw new Error(`Nie znaleziono użytkownika Supabase: ${email}`)}
async function upsert(table,rows,onConflict){for(let i=0;i<rows.length;i+=500){const {error}=await sb.from(table).upsert(rows.slice(i,i+500),{onConflict});if(error)throw error}}

function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.toLowerCase().endsWith('.xlsx')?[path.join(dir,e.name)]:[])}

const uid=await userId();
const candidates=[...files(path.join(legacy,'Dane wsadowe')),path.join(legacy,'Granice.xlsx')].filter(fs.existsSync);
let total=0,imported=0;const skipped=[];
for(const file of candidates){
  const wb=XLSX.readFile(file,{cellDates:true});const sheet=wb.Sheets[wb.SheetNames[0]];
  const probe=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,blankrows:false}).slice(0,20);
  let header=-1,type=null;for(let i=0;i<probe.length;i++){type=classify(probe[i]);if(type){header=i;break}}
  if(!type){skipped.push(path.basename(file));console.log(`POMINIĘTO: ${path.basename(file)}`);continue}
  const source=XLSX.utils.sheet_to_json(sheet,{range:header,defval:null,raw:true});
  const {data:batch,error:batchError}=await sb.from('import_batches').insert({user_id:uid,file_name:path.basename(file),file_type:type,row_count:source.length,status:'processing'}).select('id').single();
  if(batchError)throw batchError;
  let rows=[];
  if(type==='orders')rows=source.map(r=>({user_id:uid,import_batch_id:batch.id,order_no:text(r['Numer zamówienia MyPrint']),product_no:text(r['Numer produktu']),customer:text(r['Klient'])||null,product_name:text(r['Nazwa produktu'])||null,quantity:number(r['Ilość']),order_value:number(r['Wartość zamówienia']),currency:text(r['Waluta']||r['Wartość zamówienia waluta'])||null,created_at_source:iso(r['Data utworzenia']),customer_date:iso(r['Data klienta']),status:text(r['Status'])||null})).filter(r=>r.order_no);
  if(type==='shipments')rows=source.map(r=>({user_id:uid,import_batch_id:batch.id,document_no:text(r['Dokument']),order_ref:text(r['Zamówienie']),order_no:baseOrder(r['Zamówienie']),product_name:text(r['Nazwa produktu']),shipped_quantity:number(r['Wysłana ilość']),loading_date:iso(r['Załadunek/dostawa']),customer:text(r['Klient']||r['Nazwa klienta'])||null})).filter(r=>r.document_no);
  if(type==='tolerances')rows=source.map(r=>({user_id:uid,import_batch_id:batch.id,customer:text(r['KLIENT']),volume_band:text(r['NAKŁAD'])||'-',shortage_pct:number(r['BRAK']),surplus_pct:number(r['NADWYŻKA']),notes:text(r['UWAGI'])||null})).filter(r=>r.customer&&r.customer.toUpperCase()!=='KLIENT');
  await upsert(type,rows,type==='orders'?'user_id,order_no,product_no':type==='shipments'?'user_id,document_no,order_ref,product_name':'user_id,customer,volume_band');
  const {error:doneError}=await sb.from('import_batches').update({status:'completed',row_count:rows.length}).eq('id',batch.id);if(doneError)throw doneError;
  imported++;total+=rows.length;console.log(`OK: ${path.basename(file)} → ${type}, ${rows.length} rekordów`);
}
console.log(`\nMIGRACJA ZAKOŃCZONA: ${total} rekordów z ${imported} plików.`);
if(skipped.length)console.log(`Pominięto ${skipped.length}: ${skipped.join(', ')}`);
