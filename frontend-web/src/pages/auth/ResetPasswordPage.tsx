import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { confirmPasswordReset } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";
import styles from "./LoginPage.module.css";

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
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>
            Smart<span style={{ color: "#475569" }}>Sales365</span>
          </h1>
          <p className={styles.subtitle}>Restablecer contrasena</p>
        </div>

        {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}
        {successMessage ? (
          <div className={styles.errorBanner} style={{ color: "#15803d", background: "#dcfce7" }}>
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <FormInput
            label="Email"
            type="email"
            placeholder="tu-correo@ejemplo.com"
            {...register("email")}
            error={errors.email?.message}
          />
          <FormInput
            label="Codigo"
            placeholder="000000"
            maxLength={6}
            {...register("code")}
            error={errors.code?.message}
          />
          <FormInput
            label="Nueva contrasena"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <FormInput
            label="Confirmar contrasena"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Actualizar contrasena"}
          </button>
        </form>

        <button
          type="button"
          className={styles.button}
          style={{ marginTop: "16px", background: "#1f2937" }}
          onClick={() => navigate("/login")}
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
