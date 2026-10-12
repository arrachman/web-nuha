import type { TextareaHTMLAttributes } from "react";

/**
 * Atom textarea — satu-satunya cara membuat <textarea> di aplikasi ini.
 * Atribut native (name, rows, defaultValue, required, placeholder, ...)
 * diteruskan apa adanya; styling dari konteks .field / FormField.
 */
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}
