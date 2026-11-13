const response = (statusCode, data) => new Response(JSON.stringify(data), {status:statusCode, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const fail = (s,m) => response(s,{success:false,message:m});
// Compare fixed-length digests, avoiding early exit on differing password bytes.
const equal=async(a,b)=>{const enc=new TextEncoder();const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',enc.encode(v||''))));const xx=new Uint8Array(x),yy=new Uint8Array(y);let diff=0;for(let i=0;i<xx.length;i++)diff|=xx[i]^yy[i];return diff===0;};
const allowed = new Set(['balance','services','orders','detail','order']);
function endpoint(env,action){
 const path=env['CS_'+action.toUpperCase()+'_PATH'];
 if(!path || !path.startsWith('/') || path.startsWith('//')) throw Error('Chưa cấu hình endpoint '+action);
 const u=new URL(path,'https://chungsucliqi.com');
 if(u.origin!=='https://chungsucliqi.com') throw Error('Tên miền API không hợp lệ');
 return u;
}
async function call(env,action,params={},body){
 const u=endpoint(env,action); Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 const header=env.CS_API_KEY_HEADER;
 if(!header || !/^[A-Za-z0-9-]+$/.test(header)) throw Error('Chưa cấu hình tên header xác thực');
 const headers={'Accept':'application/json',[header]:(env.CS_API_KEY_PREFIX||'')+env.CS_API_KEY};
 if(body) headers['Content-Type']='application/json';
 const r=await fetch(u,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});
 let j;try{j=await r.json()}catch{throw Error('API không trả JSON; kiểm tra endpoint trong tài liệu.')}
 if(!r.ok || j.success!==true) throw Error('API từ chối hoặc phản hồi khác mẫu (HTTP '+r.status+'). Kiểm tra tài liệu / số dư / lịch sử đơn.');
 return j.data;
}
export const onRequest=async ({request,env})=>{
 const url=new URL(request.url);
 if(request.headers.has('Origin')&&request.headers.get('Origin')!==url.origin)return fail(403,'Origin không hợp lệ.');
 if(!env.APP_PASSWORD || env.APP_PASSWORD.length<16 || !env.CS_API_KEY) return fail(503,'Chưa cấu hình máy chủ: APP_PASSWORD (ít nhất 16 ký tự) và CS_API_KEY.');
 if(!await equal(request.headers.get('x-app-password'),env.APP_PASSWORD)) return fail(401,'Mật khẩu quản trị không đúng.');
 const q=Object.fromEntries(url.searchParams),a=q.action;
 if(!allowed.has(a)) return fail(400,'Thao tác không hợp lệ.');
 if(request.method!==(a==='order'?'POST':'GET')) return fail(405,'Phương thức không hợp lệ.');
 try{
  if(a==='order'){
   if(env.CS_ENABLE_ORDER!=='true') return fail(403,'Đặt đơn thật đang tắt. Chỉ bật sau khi xác minh tài liệu API.');
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return fail(415,'Cần gửi JSON.');
   if(Number(request.headers.get('content-length'))>40000)return fail(413,'Dữ liệu quá lớn.');
   let b;try{const reader=request.body?.getReader();if(!reader)return fail(400,'Thiếu dữ liệu.');let size=0;const decoder=new TextDecoder();let raw='';while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>40000){await reader.cancel();return fail(413,'Dữ liệu quá lớn.');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();b=JSON.parse(raw);}catch{return fail(400,'JSON không hợp lệ.');}
   if(!b||typeof b!=='object'||Array.isArray(b))return fail(400,'Thông tin đơn không hợp lệ.');
   const id=Number(b.package_id),qty=Number(b.quantity),codes=b.referral_codes;
   if(!Number.isSafeInteger(id)||id<1||!Number.isInteger(qty)||qty<1||qty>100||!Array.isArray(codes)||!codes.length||codes.length>100||new Set(codes).size!==codes.length||codes.some(x=>typeof x!=='string'||!x.trim()||x.length>128||x!==x.trim())||typeof b.note!=='string'||b.note.length>500) return fail(400,'Thông tin đơn không hợp lệ.');
   const svc=await call(env,'services');
   const item=svc?.services?.find(s=>Number(s.id)===id); const unit=Number(item?.price); const total=unit*qty*codes.length;
   const max=Number(env.CS_MAX_ORDER_TOTAL);
   if(!item||!Number.isFinite(unit)||unit<=0||!Number.isFinite(total)||!Number.isFinite(max)||max<=0||total>max||total!==Number(b.confirmed_total)) return fail(409,'Giá thay đổi, cấu hình giới hạn chi tiêu thiếu hoặc đơn vượt giới hạn. Tải lại dịch vụ.');
   const data=await call(env,'order',{}, {package_id:id,quantity:qty,referral_codes:codes,note:b.note});
   return response(200,{success:true,data});
  }
  const params={};
  if(a==='orders'){params.page=Math.max(1,Math.min(1000,Number(q.page)||1));params.limit=20;if(['pending','processing','completed','cancelled'].includes(q.status))params.status=q.status;}
  if(a==='detail'){if(!/^\d+$/.test(q.order_id||''))return fail(400,'Mã đơn không hợp lệ.');params.order_id=q.order_id;}
  return response(200,{success:true,data:await call(env,a,params)});
 }catch(e){return fail(502,a==='order'?'Không xác nhận được kết quả đặt đơn. Kiểm tra lịch sử trước khi gửi lại.':(e?.message?.startsWith('Chưa cấu hình')||e?.message?.startsWith('API không trả')||e?.message?.startsWith('API từ chối')||e?.message?.startsWith('Tên miền API'))?String(e.message).slice(0,240):'Lỗi kết nối API. Kiểm tra cấu hình và tài liệu.');}
};
