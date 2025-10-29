import { formatCurrency } from "../../utils/currency";
import type { Product } from "../../types/api";
import styles from "./ProductTable.module.css";

type Props = {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductTable({ products, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return <div className={styles.emptyState}>Cargando productos...</div>;
  }

  if (products.length === 0) {
    return <div className={styles.emptyState}>No hay productos cargados todavia.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table>
        <thead>
          <tr>
            <th>Imagen</th>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoria</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                {product.cover_image_url ? (
                  <img src={product.cover_image_url} alt={product.name} className={styles.cover} />
                ) : (
                  <div className={styles.cover} />
                )}
              </td>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.category_name}</td>
              <td>{formatCurrency(product.price)}</td>
              <td>{product.stock}</td>
              <td>
                <span
                  className={`${styles.status} ${product.is_active ? styles.statusActive : styles.statusInactive}`}
                >
                  {product.is_active ? "Publicado" : "Inactivo"}
                </span>
              </td>
              <td>
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={() => onEdit(product)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.danger}`}
                    onClick={() => onDelete(product)}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}




