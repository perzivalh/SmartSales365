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
import styles from "./CrudPage.module.css";

const schema = z.object({
  email: z.string().email("Introduce un email valido."),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres.").optional().or(z.literal("")),
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
      if (!matchesRole) return false;
      if (!term) return true;
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
      setFormError("password", { type: "manual", message: "La contrasena es obligatoria para crear usuarios." });
      return;
    }

    const payload: UserPayload = {
      email: values.email,
      password: values.password ? values.password : undefined,
      first_name: values.first_name ?? "",
      last_name: values.last_name ?? "",
      role: values.role,
      is_active: values.is_active,
    };

    try {
      if (editing) {
        await updateUser(editing.id, payload);
        const existingCustomer = customerMap.get(editing.id);
        if (values.role === "CLIENT") {
          const customerPayload: CustomerPayload = {
            user: editing.id,
            phone: values.phone?.trim() ?? "",
            doc_id: values.doc_id?.trim() ?? "",
          };
          if (existingCustomer) {
            await updateCustomer(existingCustomer.id, customerPayload);
          } else {
            await createCustomer(customerPayload);
          }
        } else if (existingCustomer) {
          await deleteCustomer(existingCustomer.id);
        }
      } else {
        const created = await createUser(payload);
        if (values.role === "CLIENT") {
          const customerPayload: CustomerPayload = {
            user: created.id,
            phone: values.phone?.trim() ?? "",
            doc_id: values.doc_id?.trim() ?? "",
          };
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

  async function handleDelete(user: User) {
    const confirmed = window.confirm(`Eliminar el usuario ${user.email}?`);
    if (!confirmed) return;
    try {
      await deleteUser(user.id);
      await fetchPeople();
      if (editing?.id === user.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el usuario.");
    }
  }

  function handleEdit(user: User) {
    const customer = customerMap.get(user.id);
    setEditing(user);
    reset({
      email: user.email,
      password: "",
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      phone: customer?.phone ?? "",
      doc_id: customer?.doc_id ?? "",
    });
    setIsFormOpen(true);
  }

  const modalTitle = editing ? "Editar usuario" : "Nuevo usuario";

  return (
    <div>
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>
            Administra administradores y clientes desde un solo lugar.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
          Nuevo usuario
        </button>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Buscar por email o nombre"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
        >
          <option value="all">Todos los roles</option>
          <option value="ADMIN">Administradores</option>
          <option value="CLIENT">Clientes</option>
        </select>
      </div>

      {error ? <div className={styles.alert}>{error}</div> : null}

      <section className={`${styles.card} ${styles.listCard}`}>
        {loading ? (
          <div className={styles.empty}>Cargando usuarios...</div>
        ) : filteredRows.length === 0 ? (
          <div className={styles.empty}>No hay usuarios que coincidan con los filtros.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Telefono</th>
                <th>Documento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ user, customer }) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>
                    <span className={styles.roleBadge}>{user.role === "ADMIN" ? "Administrador" : "Cliente"}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        user.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {user.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{customer?.phone || "-"}</td>
                  <td>{customer?.doc_id || "-"}</td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.button} onClick={() => handleEdit(user)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.danger}`}
                        onClick={() => handleDelete(user)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal open={isFormOpen} title={modalTitle} onClose={closeForm}>
        <form className={styles.form} onSubmit={onSubmit}>
          <FormInput label="Email" type="email" {...register("email")} error={errors.email?.message} disabled={Boolean(editing)} />
          <FormInput
            label={editing ? "Nueva contrasena (opcional)" : "Contrasena"}
            type="password"
            placeholder="********"
            {...register("password")}
            error={errors.password?.message}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <FormInput label="Nombre" {...register("first_name")} error={errors.first_name?.message} />
            <FormInput label="Apellidos" {...register("last_name")} error={errors.last_name?.message} />
          </div>
          <Select label="Rol" {...register("role")} error={errors.role?.message}>
            <option value="ADMIN">Administrador</option>
            <option value="CLIENT">Cliente</option>
          </Select>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" {...register("is_active")} /> Usuario activo
          </label>
          <FormInput label="Telefono" placeholder="+34..." {...register("phone")} error={errors.phone?.message} />
          <FormInput label="Documento" placeholder="DNI/NIE" {...register("doc_id")} error={errors.doc_id?.message} />
          <div className={styles.formActions}>
            <button type="button" className={styles.cancel} onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


