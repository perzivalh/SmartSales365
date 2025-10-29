import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";
import styles from "./LoginPage.module.css";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
});

type FormValues = z.infer<typeof schema>;

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
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>
            Smart<span style={{ color: "#475569" }}>Sales365</span>
          </h1>
          <p className={styles.subtitle}>Recuperar contrasena</p>
        </div>

        {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}
        {message ? (
          <div className={styles.errorBanner} style={{ color: "#15803d", background: "#dcfce7" }}>
            {message}
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
          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar codigo"}
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
