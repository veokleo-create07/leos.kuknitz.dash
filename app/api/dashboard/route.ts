import { NextRequest, NextResponse } from "next/server";
import { db, inquiryStatus, reservationStatus, SupabaseError } from "@/lib/server/supabase";

type DbReservation = { id:string; reservation_date:string; start_time:string; guests:number; guest_name:string; guest_email:string|null; guest_phone:string|null; special_requests:unknown; status:string; staff_status?:string; source?:string };
type DbInquiry = { id:string; guest_name:string; guest_email:string|null; guest_phone:string|null; message:string; status:string; created_at:string; preferred_date:string|null; preferred_time:string|null; party_size:number|null; is_read:boolean; archived_at:string|null; converted_reservation_id:string|null };
const json = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const clean = (s:unknown) => typeof s === "string" ? s.trim() : "";
const friendlyError=(e:unknown)=>{
  const raw=e instanceof Error?e.message:"Dashboard action failed.";
  if(raw.includes("capacity_exceeded")) return "This party size exceeds the remaining capacity for that time. Choose another time or contact the restaurant.";
  if(raw.includes("outside_hours")) return "Enter a valid date and time within restaurant hours.";
  if(raw.includes("invalid_time_interval")) return "Choose a reservation time on the hour or half hour.";
  if(raw.includes("invalid_guest_details")) return "Enter a guest name and a positive whole-number party size. Phone and email are optional.";
  return raw;
};
const mapReservation = (r:DbReservation) => ({id:r.id,name:r.guest_name,phone:r.guest_phone??"",email:r.guest_email??"",guests:r.guests,date:r.reservation_date,time:r.start_time.slice(0,5),notes:Array.isArray(r.special_requests)?r.special_requests.filter(x=>typeof x==="string").join(" · "):"",source:r.source??"Website",status:reservationStatus(r.staff_status??r.status)});
const mapInquiry = (i:DbInquiry) => ({id:i.id,name:i.guest_name,phone:i.guest_phone??"",email:i.guest_email??"",guests:i.party_size??0,preferredDate:i.preferred_date??i.created_at.slice(0,10),preferredTime:i.preferred_time?.slice(0,5)??"",message:i.message,status:inquiryStatus(i.status),unread:!i.is_read,receivedAt:i.created_at,archived:Boolean(i.archived_at),converted:Boolean(i.converted_reservation_id)});

async function list(path:string) {
  const first=await db(`${path}&limit=1000&offset=0`) as unknown[];
  const out=[...first];
  if(first.length<1000) return out;
  for(let offset=1000;offset<1000000;offset+=3000) {
    const pages=await Promise.all([0,1000,2000].map(skip=>db(`${path}&limit=1000&offset=${offset+skip}`) as Promise<unknown[]>));
    for(const page of pages) out.push(...page);
    if(pages.some(page=>page.length<1000)) break;
  }
  return out;
}

export async function GET(request:NextRequest) {
  try {
    const from=request.nextUrl.searchParams.get("from")??"1900-01-01";
    const to=request.nextUrl.searchParams.get("to")??"2999-12-31";
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)
      return json({error:"Choose a valid reservation date range."},400);
    const [rawReservations,rawInquiries]=await Promise.all([
      list(`reservations?select=id,reservation_date,start_time,guests,guest_name,guest_email,guest_phone,special_requests,status,staff_status,source&reservation_date=gte.${encodeURIComponent(from)}&reservation_date=lte.${encodeURIComponent(to)}&order=reservation_date.asc,start_time.asc`),
      list("reservation_inquiries?select=id,guest_name,guest_email,guest_phone,message,status,created_at,preferred_date,preferred_time,party_size,is_read,archived_at,converted_reservation_id&order=created_at.desc"),
    ]);
    return json({reservations:(rawReservations as DbReservation[]).map(mapReservation),inquiries:(rawInquiries as DbInquiry[]).map(mapInquiry)});
  } catch(e) { return json({error:e instanceof Error?e.message:"Could not load dashboard data."},e instanceof SupabaseError?e.status:500); }
}

export async function POST(request:NextRequest) {
  try {
    const body=await request.json() as Record<string,unknown>, action=clean(body.action);
    if(action==="delete-reservations") {
      const rawIds=body.ids;
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(!Array.isArray(rawIds)||rawIds.length===0||rawIds.length>500||rawIds.some(id=>typeof id!=="string"||!uuid.test(id)))
        return json({error:"Select between 1 and 500 valid reservations."},400);
      const ids=[...new Set(rawIds as string[])];
      const deleted=await db("rpc/staff_delete_reservations",{method:"POST",body:JSON.stringify({p_ids:ids})}) as number;
      return json({ok:true,deleted:Number(deleted)||0});
    }
    if(action==="create-reservation") {
      const requestId=clean(body.requestId), uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(!uuid.test(requestId)) return json({error:"Invalid booking request. Please try again."},400);
      const p={p_date:clean(body.date),p_time:clean(body.time),p_guests:Number(body.guests),p_name:clean(body.name),p_email:clean(body.email)||null,p_phone:clean(body.phone)||null,p_notes:clean(body.notes),p_source:"Phone"};
      if(!/^\d{4}-\d{2}-\d{2}$/.test(p.p_date)||!/^\d{2}:\d{2}$/.test(p.p_time)) return json({error:"Enter a valid date and time within restaurant hours."},400);
      if(!p.p_name||p.p_name.length<2||!Number.isSafeInteger(p.p_guests)||p.p_guests<1) return json({error:"Enter a guest name and a positive whole-number party size. Phone and email are optional."},400);
      if((p.p_email&&p.p_email.indexOf("@")<1)||(p.p_phone&&p.p_phone.length<5)) return json({error:"Check the email address or phone number, or leave the field blank."},400);
      let id:string;
      try {
        id=await db("rpc/staff_create_reservation_idempotent",{method:"POST",body:JSON.stringify({...p,p_request_id:requestId})}) as string;
      } catch(e) {
        if(!(e instanceof SupabaseError)||e.status!==404) throw e;
        // Keep bookings available while the idempotency migration is being applied.
        id=await db("rpc/staff_create_reservation",{method:"POST",body:JSON.stringify(p)}) as string;
      }
      return json({id},201);
    }
    if(action==="update-reservation") {
      const id=clean(body.id), status=clean(body.status).toLowerCase().replace("-","_");
      const source=clean(body.source);
      await db("rpc/staff_update_reservation",{method:"POST",body:JSON.stringify({p_id:id,p_date:clean(body.date),p_time:clean(body.time),p_guests:Number(body.guests),p_name:clean(body.name),p_email:clean(body.email)||null,p_phone:clean(body.phone)||null,p_notes:clean(body.notes),p_source:source,p_staff_status:status||"confirmed"})});
      return json({ok:true});
    }
    if(action==="reservation-status") {
      const status=clean(body.status).toLowerCase().replace("-","_");
      if(!["confirmed","arrived","completed","cancelled","no_show"].includes(status)) return json({error:"Invalid reservation status."},400);
      await db(`reservations?id=eq.${encodeURIComponent(clean(body.id))}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({staff_status:status,status:["cancelled","no_show"].includes(status)?"cancelled":"confirmed"})});
      return json({ok:true});
    }
    if(action==="inquiry") {
      const id=clean(body.id), uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(!uuid.test(id)) return json({error:"Invalid inquiry."},400);
      const patch:Record<string,unknown>={updated_at:new Date().toISOString(),is_read:body.read===true?true:undefined,archived_at:body.archived===true?new Date().toISOString():body.archived===false?null:undefined};
      if(typeof body.status==="string") patch.status=body.status==="In progress"?"contacted":body.status==="Handled"?"closed":"new";
      Object.keys(patch).forEach(k=>patch[k]===undefined&&delete patch[k]);
      await db(`reservation_inquiries?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)});
      return json({ok:true});
    }
    if(action==="delete-inquiry") {
      const id=clean(body.id), uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(!uuid.test(id)) return json({error:"Invalid inquiry."},400);
      const deleted=await db("rpc/staff_delete_inquiry",{method:"POST",body:JSON.stringify({p_id:id})});
      if(deleted!==true) return json({error:"Inquiry was not found."},404);
      return json({ok:true});
    }
    if(action==="convert-inquiry") {
      const result=await db("rpc/staff_convert_inquiry",{method:"POST",body:JSON.stringify({p_inquiry_id:clean(body.id),p_date:clean(body.date),p_time:clean(body.time),p_guests:Number(body.guests)||null})}) as {reservation_id:string;already_converted:boolean}[];
      return json(result?.[0]??{});
    }
    return json({error:"Unknown dashboard action."},400);
  } catch(e) { return json({error:friendlyError(e)},e instanceof SupabaseError?e.status:500); }
}
