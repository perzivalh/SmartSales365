import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { confirmPasswordReset } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";

const schema = z
  .object({
    email: z.string().email("Introduce un email valido."),
    code: z.string().length(6, "El codigo debe tener 6 caracteres."),
    password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
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

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => (location.state as LocationState | null)?.email ?? "", [location.state]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: initialEmail,
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await confirmPasswordReset({ email: values.email, code: values.code, password: values.password });
      setSuccessMessage("Contrasena actualizada. Inicia sesion con tus nuevos datos.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("No pudimos actualizar la contrasena. Verifica el codigo e intentalo nuevamente.");
    }
  });

  return (
    <div className={pageWrapperClass}>
      <div className={cardClass}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Smart<span className="text-primary">Sales365</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Restablecer contrasena</p>
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
          <FormInput label="Nueva contrasena" type="password" {...register("password")} error={errors.password?.message} />
          <FormInput
            label="Confirmar contrasena"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
          <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Actualizar contrasena"}
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
