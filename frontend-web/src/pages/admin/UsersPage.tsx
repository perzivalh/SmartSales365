import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../../api/customers";
import type { CustomerPayload } from "../../api/customers";
import { createUser, deleteUser, getUsers, updateUser } from "../../api/users";
import type { UserPayload } from "../../api/users";
import type { Customer, User } from "../../types/api";
import { Modal } from "../../components/common/Modal";
import { FormInput } from "../../components/form/FormInput";
import { Select } from "../../components/form/Select";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  password: z
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres.")
    .optional()
    .or(z.literal("")),
  first_name: z.string().optional().or(z.literal("")),
  last_name: z.string().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "CLIENT"]),
  is_active: z.boolean(),
  phone: z.string().optional().or(z.literal("")),
  doc_id: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;
type RoleFilter = "all" | "ADMIN" | "CLIENT";

const defaultValues: FormValues = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "CLIENT",
  is_active: true,
  phone: "",
  doc_id: "",
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, customersResponse] = await Promise.all([getUsers(), getCustomers()]);
      setUsers(usersResponse.results);
      setCustomers(customersResponse.results);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudo cargar la informacion de usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((customer) => {
      map.set(customer.user, customer);
    });
    return map;
  }, [customers]);

  const combinedRows = useMemo(
    () => users.map((user) => ({ user, customer: customerMap.get(user.id) ?? null })),
    [users, customerMap],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return combinedRows.filter(({ user }) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      if (!matchesRole) {
        return false;
      }
      if (!term) {
        return true;
      }
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return user.email.toLowerCase().includes(term) || fullName.includes(term);
    });
  }, [combinedRows, roleFilter, search]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    reset(defaultValues);
  };

  const openCreateModal = () => {
    setEditing(null);
    reset(defaultValues);
    setIsFormOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (!editing && !values.password) {
      setFormError("password", {
        type: "manual",
        message: "La contrasena es obligatoria para crear usuarios.",
      });
      return;
    }

    try {
      const payload: UserPayload = {
        email: values.email,
        first_name: values.first_name || "",
        last_name: values.last_name || "",
        role: values.role,
        is_active: values.is_active,
      };
      if (values.password) {
        payload.password = values.password;
      }

      let userResponse: User;
      if (editing) {
        userResponse = await updateUser(editing.id, payload);
      } else {
        userResponse = await createUser(payload);
      }

      if (values.role === "CLIENT") {
        const customerPayload: CustomerPayload = {
          user: userResponse.id,
          phone: values.phone ?? "",
          doc_id: values.doc_id ?? "",
        };
        const existingCustomer = customers.find((customer) => customer.user === userResponse.id);
        if (existingCustomer) {
          await updateCustomer(existingCustomer.id, customerPayload);
        } else {
          await createCustomer(customerPayload);
        }
      }

      await fetchPeople();
      closeForm();
    } catch (submitError) {
      console.error(submitError);
      setError("No se pudo guardar el usuario.");
    }
  });

  const handleEdit = (user: User) => {
    const customer = customerMap.get(user.id);
    setEditing(user);
    reset({
      email: user.email,
      password: "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      role: user.role,
      is_active: user.is_active,
      phone: customer?.phone ?? "",
      doc_id: customer?.doc_id ?? "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(`Eliminar el usuario ${user.email}?`);
    if (!confirmed) {
      return;
    }
    try {
      const customer = customers.find((item) => item.user === user.id);
      if (customer) {
        try {
          await deleteCustomer(customer.id);
        } catch (customerError) {
          if (!axios.isAxiosError(customerError) || customerError.response?.status !== 404) {
            throw customerError;
          }
        }
      }
      await deleteUser(user.id);
      await fetchPeople();
      if (editing?.id === user.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el usuario.");
    }
  };

  const modalTitle = editing ? "Editar usuario" : "Nuevo usuario";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3 px-[10px] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Usuarios</h1>
          <p className="text-sm text-white/60">Administra administradores y clientes desde un solo lugar.</p>
        </div>
        <button
          type="button"
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={openCreateModal}
        >
          Nuevo usuario
        </button>
      </header>

      {error ? (
        <div className="mx-[10px] rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-220px)] flex-col gap-4 px-[10px]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_auto]">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
              />
            </svg>
            <input
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/50"
              placeholder="Buscar por email o nombre..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          >
            <option value="all">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="CLIENT">Clientes</option>
          </select>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
              onClick={fetchPeople}
              aria-label="Actualizar lista"
            >
              <img src="/icons/refresh.svg" alt="Actualizar" width={18} height={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/65">
            Cargando usuarios...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            No hay usuarios registrados con los filtros aplicados.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
            <table className="w-full min-w-[720px] text-sm text-white/85">
              <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                <tr>
                  <th className="px-5 py-3 text-left">Usuario</th>
                  <th className="px-5 py-3 text-left">Rol</th>
                  <th className="px-5 py-3 text-left">Telefono</th>
                  <th className="px-5 py-3 text-left">Documento</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ user, customer }) => (
                  <tr key={user.id} className="border-b border-white/5 last:border-transparent transition hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">
                          {`${user.first_name || "Sin"} ${user.last_name || "Nombre"}`}
                        </div>
                        <div className="text-xs text-white/55">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                      {user.role === "ADMIN" ? "ADMIN" : "CLIENTE"}
                    </td>
                    <td className="px-5 py-4 text-sm text-white/75">{customer?.phone || "-"}</td>
                    <td className="px-5 py-4 text-sm text-white/75">{customer?.doc_id || "-"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
                          user.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {user.is_active ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                          onClick={() => handleEdit(user)}
                          title="Editar usuario"
                        >
                          <img src="/icons/edit.svg" alt="Editar" width={18} height={18} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500"
                          onClick={() => handleDelete(user)}
                          title="Eliminar usuario"
                        >
                          <img src="/icons/delete.svg" alt="Eliminar" width={18} height={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={isFormOpen} title={modalTitle} onClose={closeForm}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FormInput
            label="Email"
            type="email"
            placeholder="admin@smartsales365.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormInput
            label="Contrasena"
            type="password"
            placeholder={editing ? "(Opcional)" : "Minimo 6 caracteres"}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Nombre" {...register("first_name")} error={errors.first_name?.message} />
            <FormInput label="Apellido" {...register("last_name")} error={errors.last_name?.message} />
          </div>
          <Select label="Rol" error={errors.role?.message} {...register("role")}>
            <option value="CLIENT">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </Select>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input type="checkbox" {...register("is_active")} className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Usuario activo
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Telefono" placeholder="+591 700-00000" {...register("phone")} error={errors.phone?.message} />
            <FormInput label="Documento" placeholder="CI / NIT" {...register("doc_id")} error={errors.doc_id?.message} />
          </div>
          <button
            type="submit"
            className="h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : editing ? "Actualizar usuario" : "Crear usuario"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
