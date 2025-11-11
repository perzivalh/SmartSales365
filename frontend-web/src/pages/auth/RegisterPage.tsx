import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { FormInput } from "../../components/form/FormInput";
import { register as registerRequest } from "../../api/auth";

const schema = z
  .object({
    firstName: z.string().max(150, "Maximo 150 caracteres.").optional(),
    lastName: z.string().max(150, "Maximo 150 caracteres.").optional(),
    email: z.string().email("Introduce un email valido."),
    password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirma tu contrasena."),
    phone: z.string().max(30, "Maximo 30 caracteres.").optional(),
    docId: z.string().max(30, "Maximo 30 caracteres.").optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const pageWrapperClass = "flex min-h-screen items-center justify-center px-4 py-16";
const cardClass =
  "w-full max-w-lg space-y-8 rounded-[32px] border border-white/10 bg-white/95 p-10 text-slate-800 shadow-[0_40px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl";
const submitButtonClass =
  "flex h-12 w-full items-center justify-center rounded-full bg-red-600 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70";

export function RegisterPage() {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectEmail, setRedirectEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      docId: "",
    },
  });

  useEffect(() => {
    if (successMessage && redirectEmail) {
      const timer = window.setTimeout(() => {
        navigate("/verify-email", { state: { email: redirectEmail }, replace: true });
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [successMessage, redirectEmail, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await registerRequest({
        email: values.email,
        password: values.password,
        first_name: values.firstName?.trim() || undefined,
        last_name: values.lastName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        doc_id: values.docId?.trim() || undefined,
      });
      setSuccessMessage(response.detail);
      reset({
        firstName: "",
        lastName: "",
        email: values.email,
        password: "",
        confirmPassword: "",
        phone: "",
        docId: "",
      });
      setRedirectEmail(response.email);
      setSuccessMessage(response.detail);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data?.detail === "string") {
          setErrorMessage(data.detail);
        } else if (data && typeof data === "object") {
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError) && typeof firstError[0] === "string") {
            setErrorMessage(firstError[0]);
          } else if (typeof firstError === "string") {
            setErrorMessage(firstError);
          } else {
            setErrorMessage("No pudimos crear la cuenta. Intenta nuevamente.");
          }
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("No pudimos crear la cuenta. Intenta nuevamente.");
      }
      console.error(error);
    }
  });

  return (
    <div className={pageWrapperClass}>
      <div className={cardClass}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Crea tu cuenta en <span className="text-primary">SmartSales365</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Registra tus datos para comenzar a comprar.</p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{errorMessage}</div>
        ) : null}
        {successMessage ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
            {successMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Nombre" placeholder="Juan" {...register("firstName")} error={errors.firstName?.message} />
            <FormInput label="Apellido" placeholder="Perez" {...register("lastName")} error={errors.lastName?.message} />
          </div>
          <FormInput label="Email" placeholder="cliente@ejemplo.com" type="email" {...register("email")} error={errors.email?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Contrasena" type="password" placeholder="********" {...register("password")} error={errors.password?.message} />
            <FormInput
              label="Confirmar contrasena"
              type="password"
              placeholder="********"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Telefono" placeholder="777-7777" {...register("phone")} error={errors.phone?.message} />
            <FormInput label="Documento" placeholder="CI / NIT" {...register("docId")} error={errors.docId?.message} />
          </div>

          <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600">
          Ya tienes una cuenta?{" "}
          <Link to="/login" className="font-semibold text-primary transition hover:text-primary-dark">
            Inicia sesion
          </Link>
        </div>
      </div>
    </div>
  );
}
