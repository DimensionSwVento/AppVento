/**
 * Mensaje de error inline reutilizable para validación de campos (US09-02).
 * `role="alert"` para que lectores de pantalla lo anuncien.
 */
export default function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
