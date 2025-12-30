import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiPencil, HiTrash, HiCalendar, HiUsers, HiAcademicCap } from "react-icons/hi";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import Button from "../components/Button";
import type { Id } from "../../convex/_generated/dataModel";

export default function Records() {
  const records = useQuery(api.attendance.getMyAttendanceRecords, {});
  const updateAttendance = useMutation(api.attendance.updateAttendance);
  const deleteAttendance = useMutation(api.attendance.deleteAttendance);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Id<"attendanceRecords"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    type: "nuevos_asistentes" as "nuevos_asistentes" | "reset" | "conferencia",
    attended: false,
    count: 0,
  });



  const handleOpenEditModal = (record: {
    _id: Id<"attendanceRecords">;
    date: number;
    type: "nuevos_asistentes" | "reset" | "conferencia";
    attended?: boolean;
    count: number;
  }) => {
    setEditingRecord(record._id);
    
    // Convertir timestamp a formato de fecha (YYYY-MM-DD)
    const dateObj = new Date(record.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setFormData({
      date: dateStr,
      type: record.type,
      attended: record.attended ?? false,
      count: record.count,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({
      date: "",
      type: "nuevos_asistentes",
      attended: false,
      count: 0,
    });
    setErrors({});
  };

  const handleDelete = async (recordId: Id<"attendanceRecords">) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) {
      return;
    }

    try {
      await deleteAttendance({ recordId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar el registro");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsSubmitting(true);
    setErrors({});

    if (!formData.date) {
      setErrors({ date: "Debes seleccionar una fecha" });
      setIsSubmitting(false);
      return;
    }

    // Convertir fecha a timestamp
    const [year, month, day] = formData.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
    const timestamp = dateObj.getTime();

    // Validar que nuevos_asistentes solo se pueda registrar los domingos
    if (formData.type === "nuevos_asistentes") {
      const date = new Date(timestamp);
      if (date.getDay() !== 0) {
        setErrors({ date: "Los nuevos asistentes solo se pueden registrar los domingos" });
        setIsSubmitting(false);
        return;
      }
    }

    if (formData.count < 0) {
      setErrors({ count: "La cantidad debe ser un número positivo" });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateAttendance({
        recordId: editingRecord,
        date: timestamp,
        type: formData.type,
        attended: formData.type === "nuevos_asistentes" ? formData.attended : undefined,
        count: formData.count,
      });
      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el registro";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "nuevos_asistentes":
        return "Nuevos Asistentes";
      case "reset":
        return "RESET";
      case "conferencia":
        return "Conferencia";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "nuevos_asistentes":
        return "bg-blue-100 text-blue-700";
      case "reset":
        return "bg-purple-100 text-purple-700";
      case "conferencia":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "nuevos_asistentes":
        return <HiUsers className="h-4 w-4" />;
      case "reset":
        return <HiAcademicCap className="h-4 w-4" />;
      case "conferencia":
        return <HiCalendar className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (records === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros"
        description="Gestiona tus registros de asistencia"
      />

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiCalendar className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay registros
          </h3>
          <p className="text-gray-600">
            Aún no has registrado ninguna asistencia.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabla para desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Cantidad</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <HiCalendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDate(record.date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                        {getTypeIcon(record.type)}
                        {getTypeLabel(record.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {record.count} {record.count === 1 ? "persona" : "personas"}
                      </span>
                      {record.type === "nuevos_asistentes" && record.attended && (
                        <span className="ml-2 text-xs text-gray-500">(+ tú)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar registro"
                        >
                          <HiPencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record._id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar registro"
                        >
                          <HiTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards para mobile */}
          <div className="md:hidden divide-y divide-gray-200">
            {records.map((record) => (
              <div
                key={record._id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <HiCalendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(record.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                        {getTypeIcon(record.type)}
                        {getTypeLabel(record.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{record.count}</span> {record.count === 1 ? "persona" : "personas"}
                      {record.type === "nuevos_asistentes" && record.attended && (
                        <span className="ml-1 text-xs">(+ tú)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(record)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar registro"
                    >
                      <HiPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record._id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar registro"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para editar registro */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Editar Registro"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                setErrors({ ...errors, date: "" });
              }}
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.date
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              required
            />
            {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  type: e.target.value as "nuevos_asistentes" | "reset" | "conferencia",
                  attended: e.target.value === "nuevos_asistentes" ? formData.attended : false,
                });
                setErrors({ ...errors, type: "" });
              }}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              required
            >
              <option value="nuevos_asistentes">Nuevos Asistentes</option>
              <option value="reset">RESET</option>
              <option value="conferencia">Conferencia</option>
            </select>
          </div>

          {formData.type === "nuevos_asistentes" && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.attended}
                  onChange={(e) => setFormData({ ...formData, attended: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Asistí ese día</span>
              </label>
            </div>
          )}

          <div>
            <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de personas *
            </label>
            <input
              id="count"
              type="number"
              min="0"
              value={formData.count}
              onChange={(e) => {
                setFormData({ ...formData, count: parseInt(e.target.value) || 0 });
                setErrors({ ...errors, count: "" });
              }}
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.count
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              required
            />
            {errors.count && <p className="mt-1 text-sm text-red-500">{errors.count}</p>}
            {formData.type === "nuevos_asistentes" && formData.attended && (
              <p className="mt-1 text-xs text-gray-500">
                El total será: {formData.count + 1} personas (incluyéndote)
              </p>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleCloseModal}
              variant="outline"
              rounded="xl"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              rounded="xl"
              fullWidth
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

