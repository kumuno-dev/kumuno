import type { ReactElement,ReactNode } from "react";
import type { AdminFormState } from "./index.mjs";
export function ManagementForm(props:{action:(state:AdminFormState,form:FormData)=>Promise<AdminFormState>;children:ReactNode;label?:string}):ReactElement;
