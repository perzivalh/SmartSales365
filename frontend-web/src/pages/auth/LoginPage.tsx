import axios from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormInput } from "../../components/form/FormInput";
import { useAuth } from "../../hooks/useAuth";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
});

type FormValues = z.infer<typeof schema>;

type LocationState = {
  from?: Location;
  message?: string;
};

const pageWrapperClass = "flex min-h-screen items-center justify-center px-4 py-16";
const cardClass =
  "w-full max-w-md space-y-8 rounded-[32px] border border-white/10 bg-white/95 p-10 text-slate-800 shadow-[0_40px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl";
const submitButtonClass =
  "flex h-12 w-full items-center justify-center rounded-full bg-red-600 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (sessionExpired) {
      setSessionMessage("Tu sesion expiro. Inicia sesion nuevamente para continuar.");
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.message) {
      setSessionMessage(state.message);
    }
  }, [location.state]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    setSessionMessage(null);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as Record<string, unknown> | undefined;
        let message = "Credenciales invalidas.";
        let detailCode = typeof data?.code === "string" ? (data?.code as string) : undefined;
        const detailValue = data?.detail;

        if (typeof detailValue === "string") {
          message = detailValue;
        } else if (detailValue && typeof detailValue === "object") {
          const detailObject = detailValue as { detail?: unknown; message?: unknown; code?: unknown };
          if (typeof detailObject.detail === "string") {
            message = detailObject.detail;
          } else if (typeof detailObject.message === "string") {
            message = detailObject.message;
          }
          if (typeof detailObject.code === "string") {
            detailCode = detailObject.code;
          }
        } else if (typeof data?.message === "string") {
          message = data.message as string;
        }

        if (detailCode === "email_not_verified" || message.toLowerCase().includes("no verificado")) {
          navigate("/verify-email", { state: { email: values.email }, replace: true });
          return;
        }

        setErrorMessage(message);
      } else {
        setErrorMessage("Ocurrio un error. Intenta nuevamente.");
      }
      console.error(error);
    }
  });

  return (
    <div className={pageWrapperClass}>
      <div className={cardClass}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Smart<span className="text-primary">Sales365</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Bienvenido de nuevo</p>
        </div>

        {sessionMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {sessionMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <FormInput
            label="Email"
            placeholder="admin@demo.com"
            type="email"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <FormInput
            label="Contrasena"
            placeholder="********"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <Link to="/forgot-password" className="text-sm font-semibold text-red-600 transition hover:text-red-500">
            Olvidaste tu contrasena?
          </Link>
          <p className="text-sm text-slate-600">
            No tienes una cuenta?
            <Link to="/register" className="ml-1 font-semibold text-primary transition hover:text-primary-dark">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
