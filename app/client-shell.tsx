"use client";

import dynamic from "next/dynamic";

const RealPlanner = dynamic(() => import("./real-planner"), {
  ssr: false,
  loading: () => (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f7f5ef",color:"#52635d",fontFamily:"sans-serif"}}>
      正在加载真实地图与旅行数据…
    </main>
  ),
});

export default function ClientShell(props:{user:{name:string;email:string}|null;signInPath:string;signOutPath:string}) {
  return <RealPlanner {...props}/>;
}
