export async function GET() {
  return Response.json({trips:[],message:"独立公开版暂不提供云端保存"});
}

export async function POST() {
  return Response.json({error:"独立公开版暂不提供云端保存"},{status:501});
}
