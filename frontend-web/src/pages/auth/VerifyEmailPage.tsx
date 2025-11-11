import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { resendVerification, verifyEmail } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  code: z.string().length(6, "El codigo debe tener 6 caracteres."),
});

type FormValues = z.infer<typeof schema>;

type LocationState = {
  email?: string;
};

const pageWrapperClass = "flex min-h-screen items-center justify-center px-4 py-16";
const cardClass =
  "w-full max-w-md space-y-8 rounded-[32px] border border-white/10 bg-white/95 p-10 text-slate-800 shadow-[0_40px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl";
const submitButtonClass =
  "flex h-12 w-full items-center justify-center rounded-full bg-red-600 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70";

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => (location.state as LocationState | null)?.email ?? "", [location.state]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: initialEmail,
      code: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await verifyEmail(values);
      setSuccessMessage("Cuenta verificada. Inicia sesion para continuar.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("No pudimos verificar tu codigo. Revisa los datos e intentalo de nuevo.");
    }
  });

  async function handleResend() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResending(true);
    try {
      const emailValue = getValues("email");
      await resendVerification(emailValue);
      setSuccessMessage("Enviamos un nuevo codigo de verificacion a tu correo.");
    } catch (error) {
      console.error(error);
      setErrorMessage("No pudimos reenviar el codigo. Intenta mas tarde.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className={pageWrapperClass}>
      <div className={cardClass}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Smart<span className="text-primary">Sales365</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Verifica tu correo electronico</p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
            {successMessage}
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
          <FormInput label="Codigo" placeholder="000000" maxLength={6} {...register("code")} error={errors.code?.message} />
          <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Verificando..." : "Verificar"}
          </button>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Enviando..." : "Reenviar codigo"}
          </button>
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
            onClick={() => navigate("/login")}
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
