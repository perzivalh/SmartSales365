import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormInput } from "../../components/form/FormInput";
import { useAuth } from "../../hooks/useAuth";
import styles from "./LoginPage.module.css";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
});

type FormValues = z.infer<typeof schema>;

type LocationState = {
  from?: Location;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/admin/products";
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
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>
            Smart<span style={{ color: "#475569" }}>Sales365</span>
          </h1>
          <p className={styles.subtitle}>Bienvenido de nuevo</p>
        </div>

        {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <Link to="/forgot-password" style={{ color: "#dc2626", fontWeight: 600 }}>
            Olvidaste tu contrasena?
          </Link>
        </div>
      </div>
    </div>
  );
}
