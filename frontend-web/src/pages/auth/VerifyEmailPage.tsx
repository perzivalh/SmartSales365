import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { resendVerification, verifyEmail } from "../../api/auth";
import { FormInput } from "../../components/form/FormInput";
import styles from "./LoginPage.module.css";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  code: z.string().length(6, "El codigo debe tener 6 caracteres."),
});

type FormValues = z.infer<typeof schema>;

type LocationState = {
  email?: string;
};

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
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>
            Smart<span style={{ color: "#475569" }}>Sales365</span>
          </h1>
          <p className={styles.subtitle}>Verifica tu correo electronico</p>
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
          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Verificando..." : "Verificar"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
          <button
            type="button"
            className={styles.button}
            style={{ background: "#1d4ed8" }}
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Enviando..." : "Reenviar codigo"}
          </button>
          <button
            type="button"
            className={styles.button}
            style={{ background: "#0f172a" }}
            onClick={() => navigate("/login")}
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
