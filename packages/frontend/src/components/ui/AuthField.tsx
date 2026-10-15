import { InputHTMLAttributes, useState } from 'react'
export function AuthField({ label, error, hint, id, name, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string[]; hint?: string }) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? name
  return <div>
    <label htmlFor={fieldId} className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className={type === 'password' ? 'password-wrap' : ''}>
      <input {...props} id={fieldId} name={name} type={type === 'password' && visible ? 'text' : type}
        aria-invalid={!!error?.length} aria-describedby={error?.length ? fieldId + '-error' : hint ? fieldId + '-hint' : undefined}
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50" />
      {type === 'password' && <button type="button" className="password-toggle" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>}
    </div>
    {error?.length ? <p id={fieldId + '-error'} className="text-sm text-red-700 mt-1">{error.join(' ')}</p> : hint ? <p id={fieldId + '-hint'} className="text-sm text-gray-500 mt-1">{hint}</p> : null}
  </div>
}
export const FormError = ({ errors }: { errors: Record<string, string[]> }) => Object.values(errors).some((messages) => messages.length)
  ? <div role="alert" className="bg-red-50 text-red-700 rounded p-4">{errors._form?.length ? errors._form.join(' ') : 'Revisa los campos señalados antes de continuar.'}</div> : null
