import { NextRequest, NextResponse } from "next/server";
import { db, reservationStatus, SupabaseError } from "@/lib/server/supabase";

type DbReservation = { id:string; reservation_date:string; start_time:string; guests:number; guest_name:string; guest_email:string|null; guest_phone:string|null; special_requests:unknown; status:string; staff_status?:string; source?:string };
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

async function list(path:string) {
  const out:unknown[]=[];
  for(let offset=0;offset<1000000;offset+=1000) {
    const page=await db(`${path}&limit=1000&offset=${offset}`) as unknown[];
    out.push(...page); if(page.length<1000) break;
  }
  return out;
}

export async function GET(request:NextRequest) {
  try {
    const from=request.nextUrl.searchParams.get("from")??"1900-01-01";
    const to=request.nextUrl.searchParams.get("to")??"2999-12-31";
    const rawReservations=await list(`reservations?select=id,reservation_date,start_time,guests,guest_name,guest_email,guest_phone,special_requests,status,staff_status,source&reservation_date=gte.${encodeURIComponent(from)}&reservation_date=lte.${encodeURIComponent(to)}&order=reservation_date.asc,start_time.asc`);
    return json({reservations:(rawReservations as DbReservation[]).map(mapReservation)});
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
    return json({error:"Unknown dashboard action."},400);
  } catch(e) { return json({error:friendlyError(e)},e instanceof SupabaseError?e.status:500); }
}
