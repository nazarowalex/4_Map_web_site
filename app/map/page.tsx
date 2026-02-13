
import { Suspense } from "react";
import MapClient from "./MapClient";
export default function Page(){
  return <Suspense fallback={<div>Loading...</div>}><MapClient/></Suspense>
}
