"use client";
import { createElement as h, useActionState } from "react";
export function ManagementForm({action,children,label="保存する"}) {
 const [state,submit,pending]=useActionState(action,{});
 return h("form",{action:submit,className:"management-form"},
  h("fieldset",{disabled:pending},children),
  state.error&&h("p",{role:"alert",className:"notice-error"},state.error),
  state.success&&h("p",{role:"status",className:"notice-success"},state.success),
  h("button",{className:"primary-button",disabled:pending},pending?"保存中…":label)
 );
}
