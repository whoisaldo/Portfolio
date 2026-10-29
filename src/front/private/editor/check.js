// src/front/private/editor/check.js: whether the editor may open a draft
// (canEdit in ./markdown.js), with the editor's own schema. Loaded with the
// editor, before it is shown.
import { getSchema } from "@tiptap/core";
import { canEdit } from "./markdown";
import { extensions } from "./schema";

let schema = null;

export function check(body) {
  schema ??= getSchema(extensions());
  return canEdit(body, (json) => schema.nodeFromJSON(json)).ok;
}
