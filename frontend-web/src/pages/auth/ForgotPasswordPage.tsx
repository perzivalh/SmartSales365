import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
});

type FormValues = z.infer<typeof schema>;

const pageWrapperClass = "flex min-h-screen items-center justify-center px-4 py-16";
const cardClass =
  "w-full max-w-md space-y-8 rounded-[32px] border border-white/10 bg-white/95 p-10 text-slate-800 shadow-[0_40px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl";
const submitButtonClass =
  "flex h-12 w-full items-center justify-center rounded-full bg-red-600 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setErrorMessage(null);
    try {
      await requestPasswordReset(values.email);
      setMessage("Te enviamos un codigo para restablecer tu contrasena.");
      setTimeout(() => navigate("/reset-password", { state: { email: values.email } }), 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("No pudimos enviar el correo. Intenta mas tarde.");
    }
  });

  return (
    <div className={pageWrapperClass}>
      <div className={cardClass}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Smart<span className="text-primary">Sales365</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Recuperar contrasena</p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
            {message}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <FormInput
            label="Email"
            type="email"
            placeholder="tu-correo@ejemplo.com"
            {...register("email")}
            error={errors.email?.message}
          />
          <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar codigo"}
          </button>
        </form>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-full border border-slate-300 text-sm font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-primary hover:text-primary"
          onClick={() => navigate("/login")}
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
