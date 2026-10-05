import type { ReactElement } from "react";
export type AdminFormState = { error?:string; success?:string };
export type DepartmentOption = { id:string; name:string };
export type UserFieldsValue = { id:string; name:string; email:string; employeeCode:string|null; departmentId:string|null; role:"USER"|"MANAGER"|"ADMIN"; isActive:boolean };
export type DepartmentFieldsValue = { id:string; code:string; name:string; parentId:string|null };
export function UserFields(props:{user?:UserFieldsValue;departments:readonly DepartmentOption[];passwordHelpId?:string}):ReactElement;
export function DepartmentFields(props:{department?:DepartmentFieldsValue;departments:readonly DepartmentOption[]}):ReactElement;
