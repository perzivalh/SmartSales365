import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { startCheckout, confirmCheckout } from "../../api/orders";
import type { CheckoutPayload, Order } from "../../types/api";
import { useCart } from "../../hooks/useCart";
import { FormInput } from "../../components/form/FormInput";
import { Textarea } from "../../components/form/Textarea";
import { formatCurrency } from "../../utils/currency";

const checkoutDetailsSchema = z.object({
  name: z.string().min(3, "Ingresa tu nombre completo."),
  email: z.string().email("Introduce un email valido."),
  phone: z.string().max(30, "El telefono es demasiado largo.").optional(),
  line1: z.string().min(5, "La direccion es obligatoria."),
  line2: z.string().optional(),
  city: z.string().min(2, "La ciudad es obligatoria."),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z
    .string()
    .min(2, "Usa el codigo de pais de 2 letras.")
    .max(2, "Usa el codigo de pais de 2 letras."),
  notes: z.string().max(400, "El mensaje es muy largo.").optional(),
});

type CheckoutDetailsForm = z.infer<typeof checkoutDetailsSchema>;

type CheckoutStep = "details" | "payment" | "success";

type PaymentStepProps = {
  orderId: string;
  customerEmail: string;
  onSuccess: (order: Order) => void;
  onError: (message: string | null) => void;
};

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "";
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.non_field_errors) && typeof data?.non_field_errors[0] === "string") {
      return data.non_field_errors[0] as string;
    }
    return error.message || "Ocurrio un error inesperado.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrio un error inesperado.";
}

function PaymentStep({ orderId, customerEmail, onSuccess, onError }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleConfirmPayment = async () => {
    if (!stripe || !elements) {
      onError("El formulario de pago aun se esta cargando. Intenta nuevamente en un momento.");
      return;
    }
    setProcessing(true);
    onError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: customerEmail,
      },
      redirect: "if_required",
    });

    if (result.error) {
      onError(result.error.message ?? "No se pudo procesar el pago. Intenta nuevamente.");
      setProcessing(false);
      return;
    }

    try {
      const paymentIntentId = result.paymentIntent?.id;
      const order = await confirmCheckout(orderId, paymentIntentId ?? undefined);
      onSuccess(order);
    } catch (error) {
      onError(getErrorMessage(error));
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <button
        type="button"
        className="w-full rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={handleConfirmPayment}
        disabled={processing || !stripe || !elements}
      >
        {processing ? "Procesando pago..." : "Confirmar pago"}
      </button>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, subtotal, originalSubtotal, savings, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>("details");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutTotal, setCheckoutTotal] = useState<number>(subtotal);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [shippingSnapshot, setShippingSnapshot] = useState<CheckoutPayload["shipping_address"] | null>(null);
  const [notesSnapshot, setNotesSnapshot] = useState<string | undefined>(undefined);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutDetailsForm>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "BO",
      notes: "",
    },
  });

  useEffect(() => {
    if (items.length === 0 && step === "details") {
      navigate("/cart", { replace: true });
    }
  }, [items.length, navigate, step]);

  const cartSummary = useMemo(() => {
    if (step === "success" && orderResult) {
      const totalAmount = Number(orderResult.total_amount);
      const subtotalAmount = Number(orderResult.subtotal_amount);
      const discountAmount = Number(orderResult.discount_amount ?? "0");
      return {
        subtotal: subtotalAmount - discountAmount,
        originalSubtotal: subtotalAmount,
        savings: discountAmount,
        tax: 0,
        shipping: 0,
        total: totalAmount,
      };
    }

    const tax = 0;
    const shipping = 0;
    return {
      subtotal,
      originalSubtotal,
      savings,
      tax,
      shipping,
      total: subtotal + tax + shipping,
    };
  }, [subtotal, originalSubtotal, savings, orderResult, step]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", {
        replace: true,
        state: { from: { pathname: "/checkout" }, message: "Inicia sesion para completar tu compra." },
      });
    }
  }, [isAuthenticated, navigate]);

  const displayItems = useMemo(
    () =>
      step === "success" && orderResult
        ? orderResult.items.map((item) => {
            const discountAmount = Number(item.discount_amount ?? "0");
            const promotionLabel =
              typeof item.promotion_snapshot?.name === "string" ? (item.promotion_snapshot.name as string) : null;
            return {
              id: item.id,
              name: item.product_name,
              sku: item.product_sku,
              quantity: item.quantity,
              total: Number(item.total_price),
              originalTotal: Number(item.total_price) + discountAmount,
              promotionLabel,
            };
          })
        : items.map((item) => ({
            id: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            total: item.price * item.quantity,
            originalTotal: (item.originalPrice ?? item.price) * item.quantity,
            promotionLabel: item.promotionLabel ?? null,
          })),
    [items, orderResult, step],
  );

  const handleDetailsSubmit = handleSubmit(async (values) => {
    if (items.length === 0) {
      setErrorMessage("Tu carrito esta vacio.");
      return;
    }
    if (!stripePromise) {
      setErrorMessage("Stripe no esta configurado. Define la clave publica en las variables de entorno.");
      return;
    }

    setErrorMessage(null);
    const payload: CheckoutPayload = {
      cart: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      customer: {
        email: values.email,
        name: values.name,
        phone: values.phone?.trim() || undefined,
      },
      shipping_address: {
        line1: values.line1,
        line2: values.line2?.trim() || undefined,
        city: values.city,
        state: values.state?.trim() || undefined,
        postal_code: values.postalCode?.trim() || undefined,
        country: values.country.toUpperCase(),
      },
      notes: values.notes?.trim() || undefined,
    };

    try {
      const response = await startCheckout(payload);
      setOrderId(response.order_id);
      setClientSecret(response.client_secret);
      setCheckoutTotal(Number(response.total_amount));
      setCustomerEmail(values.email);
      setShippingSnapshot(payload.shipping_address);
      setNotesSnapshot(payload.notes);
      setStep("payment");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  const handlePaymentSuccess = (order: Order) => {
    setOrderResult(order);
    clearCart();
    setStep("success");
  };

  const renderDetailsStep = () => (
    <form className="space-y-6" onSubmit={handleDetailsSubmit}>
      <div className="grid gap-5 lg:grid-cols-2">
        <FormInput label="Nombre completo" placeholder="Juan Perez" {...register("name")} error={errors.name?.message} />
        <FormInput label="Email" placeholder="cliente@correo.com" type="email" {...register("email")} error={errors.email?.message} />
        <FormInput label="Telefono" placeholder="777-777" {...register("phone")} error={errors.phone?.message} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FormInput label="Direccion" placeholder="Av. Principal 123" {...register("line1")} error={errors.line1?.message} />
        <FormInput label="Complemento" placeholder="Depto, referencia..." {...register("line2")} error={errors.line2?.message} />
        <FormInput label="Ciudad" placeholder="La Paz" {...register("city")} error={errors.city?.message} />
        <FormInput label="Estado / Provincia" placeholder="La Paz" {...register("state")} error={errors.state?.message} />
        <FormInput label="Codigo postal" placeholder="0000" {...register("postalCode")} error={errors.postalCode?.message} />
        <FormInput
          label="Pais (ISO)"
          placeholder="BO"
          maxLength={2}
          {...register("country")}
          error={errors.country?.message}
        />
      </div>

      <Textarea label="Notas" placeholder="Instrucciones especiales" {...register("notes")} error={errors.notes?.message} />

      <button
        type="submit"
        className="w-full rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creando pago..." : "Continuar con el pago"}
      </button>
    </form>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/15 bg-white/5 p-6 text-sm text-slate-200">
        <p className="text-base font-semibold text-white">Resumen de envio</p>
        <p className="mt-2">
          {shippingSnapshot?.line1}
          {shippingSnapshot?.line2 ? `, ${shippingSnapshot.line2}` : ""}
        </p>
        <p>
          {shippingSnapshot?.city}
          {shippingSnapshot?.state ? `, ${shippingSnapshot.state}` : ""}
        </p>
        <p>
          {shippingSnapshot?.postal_code ? `${shippingSnapshot.postal_code}, ` : ""}
          {shippingSnapshot?.country}
        </p>
        {notesSnapshot ? <p className="mt-3 text-slate-300">Notas: {notesSnapshot}</p> : null}
      </div>

      {stripePromise && clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              labels: "floating",
            },
          }}
        >
          <PaymentStep
            orderId={orderId!}
            customerEmail={customerEmail}
            onSuccess={handlePaymentSuccess}
            onError={setErrorMessage}
          />
        </Elements>
      ) : (
        <div className="rounded-[24px] border border-red-500/30 bg-red-900/30 px-4 py-5 text-center text-sm font-semibold text-red-200">
          No se pudo cargar el formulario de pago. Verifica tu configuracion de Stripe.
        </div>
      )}
    </div>
  );

  const renderSuccessStep = () => {
    if (!orderResult) return null;

    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-emerald-500/40 bg-emerald-900/30 p-6 text-center">
          <h2 className="text-3xl font-semibold text-white">Pago completado</h2>
          <p className="mt-2 text-sm text-slate-200">
            Gracias por tu compra. Tu pedido <span className="font-semibold text-white">{orderResult.number}</span> esta confirmado.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/15 bg-white/5 p-6">
          <h3 className="text-xl font-semibold text-white">Detalle del pedido</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <p>
              <span className="font-semibold text-white">Total:</span> {formatCurrency(Number(orderResult.total_amount))} {orderResult.currency}
            </p>
            <p>
              <span className="font-semibold text-white">Pagado el:</span> {orderResult.paid_at ? new Date(orderResult.paid_at).toLocaleString() : "-"}
            </p>
            <p>
              <span className="font-semibold text-white">Enviado a:</span> {orderResult.shipping_address_line1}
              {orderResult.shipping_address_line2 ? `, ${orderResult.shipping_address_line2}` : ""} - {orderResult.shipping_city},{" "}
              {orderResult.shipping_state ? `${orderResult.shipping_state}, ` : ""}
              {orderResult.shipping_country}
            </p>
            {orderResult.receipt_url ? (
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
                onClick={() => window.open(orderResult.receipt_url ?? "", "_blank")}
              >
                Ver comprobante
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {orderResult.items.map((item) => {
              const discountAmount = Number(item.discount_amount ?? "0");
              const hasPromotion = discountAmount > 0;
              const promotionName =
                typeof item.promotion_snapshot?.name === "string" ? (item.promotion_snapshot.name as string) : null;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                >
                  <div>
                    <p className="font-semibold text-white">{item.product_name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.product_sku}</p>
                    {promotionName ? (
                      <span className="mt-1 inline-flex rounded-full bg-primary/15 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                        {promotionName}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p>{item.quantity} uds</p>
                    <p className="font-semibold text-white">{formatCurrency(Number(item.total_price))}</p>
                    {hasPromotion ? (
                      <p className="text-xs text-white/60 line-through">
                        {formatCurrency(Number(item.total_price) + discountAmount)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
            onClick={() => navigate("/", { state: { targetSection: "catalogo" } })}
          >
            Seguir comprando
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
            onClick={() => navigate("/orders")}
          >
            Ver historial
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6">
        <header>
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            Checkout
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-white">Completa tu pedido</h1>
          <p className="mt-2 text-sm text-slate-300">
            Ingresa tu informacion y completa el pago de manera segura con Stripe.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/40 px-4 py-3 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {step === "details" ? renderDetailsStep() : null}
        {step === "payment" ? renderPaymentStep() : null}
        {step === "success" ? renderSuccessStep() : null}
      </section>

      <aside className="h-fit rounded-[24px] border border-white/15 bg-white/5 p-6 text-sm text-slate-200">
        <h2 className="text-xl font-semibold text-white">Resumen del carrito</h2>
        <div className="mt-4 space-y-3">
          {displayItems.map((item) => {
            const hasPromotion = item.originalTotal && item.originalTotal > item.total;
            return (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.quantity} uds</p>
                  {item.promotionLabel ? (
                    <span className="mt-1 inline-flex rounded-full bg-primary/15 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                      {item.promotionLabel}
                    </span>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="font-semibold text-white">{formatCurrency(item.total)}</span>
                  {hasPromotion ? (
                    <div className="text-xs text-white/60 line-through">{formatCurrency(item.originalTotal!)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
          {cartSummary.originalSubtotal !== undefined && cartSummary.originalSubtotal > cartSummary.subtotal ? (
            <div className="flex items-center justify-between">
              <span>Subtotal sin descuentos</span>
              <span className="font-semibold text-white">
                {formatCurrency(cartSummary.originalSubtotal ?? cartSummary.subtotal)}
              </span>
            </div>
          ) : null}
          {cartSummary.savings ? (
            <div className="flex items-center justify-between text-emerald-300">
              <span>Ahorro promocional</span>
              <span>-{formatCurrency(cartSummary.savings)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-white">{formatCurrency(cartSummary.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Impuestos</span>
            <span className="font-semibold text-white">{formatCurrency(cartSummary.tax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Envio</span>
            <span className="font-semibold text-white">{cartSummary.shipping === 0 ? "Gratis" : formatCurrency(cartSummary.shipping)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Total</span>
            <span>{formatCurrency(step === "payment" || step === "success" ? checkoutTotal : cartSummary.total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
