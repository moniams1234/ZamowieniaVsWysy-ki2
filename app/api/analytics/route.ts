import {NextRequest,NextResponse} from 'next/server';
import {userSupabase} from '@/lib/supabase';
import {buildOperationalSnapshot} from '@/lib/operations';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(req:NextRequest){try{const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return NextResponse.json({error:'Wymagane logowanie.'},{status:401});const sb=userSupabase(token);const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Sesja wygasła.'},{status:401});const p=req.nextUrl.searchParams;return NextResponse.json(await buildOperationalSnapshot(sb,p.get('from'),p.get('to')))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Nie udało się przeliczyć danych.'},{status:500})}}
