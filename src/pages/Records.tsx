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
  const coLeaders = useQuery(api.attendance.getCoLeaders);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Id<"attendanceRecords"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    type: "nuevos" as "nuevos" | "asistencias" | "reset" | "conferencia",
    service: null as "saturday-1" | "saturday-2" | "sunday-1" | "sunday-2" | null,
    sede: null as "CENTRAL" | "LINCE" | "LOS OLIVOS" | "SJM" | "VMT" | "PACHACAMAC" | "SJL" | "CHORRILLOS" | "SURCO" | "MIRAFLORES" | "VES" | null,
    attended: false,
    maleCount: 0,
    femaleCount: 0,
    kidsCount: 0,
    coLeaderId: null as Id<"users"> | null,
    coLeaderAttended: undefined as boolean | undefined,
  });



  const handleOpenEditModal = (record: {
    _id: Id<"attendanceRecords">;
    date: number;
    type: "nuevos" | "asistencias" | "reset" | "conferencia";
    service?: "saturday-1" | "saturday-2" | "sunday-1" | "sunday-2";
    sede?: "CENTRAL" | "LINCE" | "LOS OLIVOS" | "SJM" | "VMT" | "PACHACAMAC" | "SJL" | "CHORRILLOS" | "SURCO" | "MIRAFLORES" | "VES";
    attended?: boolean;
    maleCount: number;
    femaleCount: number;
    kidsCount?: number;
  }) => {
    setEditingRecord(record._id);
    
    // Convertir timestamp a formato de fecha (YYYY-MM-DD)
    // El timestamp está guardado como medianoche UTC para la fecha calendario
    // Usar getUTCFullYear, getUTCMonth, getUTCDate para extraer los componentes UTC
    const dateObj = new Date(record.date);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Buscar registro relacionado del colíder (misma fecha y tipo)
    let coLeaderId: Id<"users"> | null = null;
    // coLeaderAttended se inicializa como undefined y puede ser establecido por el usuario
    const coLeaderAttended: boolean | undefined = undefined;
    
    if (coLeaders && coLeaders.length > 0 && (record.type === "asistencias" || record.type === "conferencia")) {
      // Si hay un solo colíder, usarlo por defecto
      if (coLeaders.length === 1) {
        coLeaderId = coLeaders[0]._id;
      }
      
      // Buscar si hay un registro del colíder para la misma fecha y tipo
      // Nota: Esto solo busca en los registros visibles del usuario actual
      // El backend manejará la búsqueda real del registro del colíder
    }

    setFormData({
      date: dateStr,
      type: record.type,
      service: record.service || null,
      sede: record.sede || null,
      attended: record.attended ?? false,
      maleCount: record.maleCount,
      femaleCount: record.femaleCount,
      kidsCount: record.kidsCount || 0,
      coLeaderId,
      coLeaderAttended,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({
      date: "",
      type: "nuevos",
      service: null,
      sede: null,
      attended: false,
      maleCount: 0,
      femaleCount: 0,
      kidsCount: 0,
      coLeaderId: null,
      coLeaderAttended: undefined,
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

    // Validar servicio solo para nuevos y asistencias
    if (
      (formData.type === "nuevos" || formData.type === "asistencias") &&
      !formData.service
    ) {
      setErrors({ service: "Debes seleccionar un servicio" });
      setIsSubmitting(false);
      return;
    }

    // Convertir fecha a timestamp (usando UTC para preservar la fecha calendario)
    const [year, month, day] = formData.date.split('-').map(Number);
    // Crear fecha en UTC a medianoche para la fecha seleccionada
    // Esto representa la fecha calendario sin considerar zona horaria
    const timestamp = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

    if (formData.maleCount < 0 || formData.femaleCount < 0 || formData.kidsCount < 0) {
      setErrors({ count: "Las cantidades deben ser números no negativos" });
      setIsSubmitting(false);
      return;
    }

    if (formData.maleCount === 0 && formData.femaleCount === 0 && formData.kidsCount === 0) {
      setErrors({ count: "Debes registrar al menos una persona" });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateAttendance({
        recordId: editingRecord,
        date: timestamp,
        type: formData.type,
        service: (formData.type === "nuevos" || formData.type === "asistencias") ? formData.service || undefined : undefined,
        sede: formData.sede || undefined,
        attended: (formData.type === "asistencias" || formData.type === "conferencia") ? formData.attended : undefined,
        maleCount: formData.maleCount,
        femaleCount: formData.femaleCount,
        kidsCount: formData.kidsCount,
        coLeaderId: (formData.type === "asistencias" || formData.type === "conferencia") ? formData.coLeaderId || undefined : undefined,
        coLeaderAttended: (formData.type === "asistencias" || formData.type === "conferencia") ? formData.coLeaderAttended : undefined,
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
      case "nuevos":
        return "Nuevos Asistentes";
      case "asistencias":
        return "Asistencias";
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
      case "nuevos":
        return "bg-blue-100 text-blue-700";
      case "asistencias":
        return "bg-green-100 text-green-700";
      case "reset":
        return "bg-purple-100 text-purple-700";
      case "conferencia":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "nuevos":
        return <HiUsers className="h-4 w-4" />;
      case "asistencias":
        return <HiCalendar className="h-4 w-4" />;
      case "reset":
        return <HiAcademicCap className="h-4 w-4" />;
      case "conferencia":
        return <HiCalendar className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    // El timestamp está guardado como UTC medianoche para la fecha calendario
    // Usar métodos UTC para extraer los componentes y evitar problemas de zona horaria
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    // Formatear manualmente para evitar conversión de zona horaria
    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    return `${day} de ${monthNames[month]} de ${year}`;
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
                        {record.maleCount + record.femaleCount + (record.kidsCount || 0)} {(record.maleCount + record.femaleCount + (record.kidsCount || 0)) === 1 ? "persona" : "personas"}
                      </span>
                      {(record.type === "asistencias" || record.type === "conferencia") && record.attended && (
                        <span className="ml-2 text-xs text-gray-500">(+ tú)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="p-2 text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
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
                      <span className="font-medium">{record.maleCount + record.femaleCount + (record.kidsCount || 0)}</span> {(record.maleCount + record.femaleCount + (record.kidsCount || 0)) === 1 ? "persona" : "personas"}
                      {(record.type === "asistencias" || record.type === "conferencia") && record.attended && (
                        <span className="ml-1 text-xs">(+ tú)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(record)}
                      className="p-2 text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
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
                  type: e.target.value as "nuevos" | "asistencias" | "reset" | "conferencia",
                  attended: (e.target.value === "asistencias" || e.target.value === "conferencia") ? formData.attended : false,
                });
                setErrors({ ...errors, type: "" });
              }}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              required
            >
              <option value="nuevos">Nuevos Asistentes</option>
              <option value="asistencias">Asistencias</option>
              <option value="reset">RESET</option>
              <option value="conferencia">Conferencia</option>
            </select>
          </div>

          {/* Servicio (solo para nuevos y asistencias) */}
          {(formData.type === "nuevos" || formData.type === "asistencias") && (
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                Servicio *
              </label>
              <select
                id="service"
                value={formData.service || ""}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    service: e.target.value ? (e.target.value as "saturday-1" | "saturday-2" | "sunday-1" | "sunday-2") : null,
                  });
                  setErrors({ ...errors, service: "" });
                }}
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.service
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                required
              >
                <option value="">Selecciona un servicio</option>
                <option value="saturday-1">Sábado NEXT 5PM</option>
                <option value="saturday-2">Sábado NEXT 7PM</option>
                <option value="sunday-1">Domingo 9AM</option>
                <option value="sunday-2">Domingo 11:30AM</option>
              </select>
              {errors.service && <p className="mt-1 text-sm text-red-500">{errors.service}</p>}
            </div>
          )}

          {/* Sede */}
          <div>
            <label htmlFor="sede" className="block text-sm font-medium text-gray-700 mb-2">
              Sede
            </label>
            <select
              id="sede"
              value={formData.sede || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  sede: e.target.value ? (e.target.value as typeof formData.sede) : null,
                });
                setErrors({ ...errors, sede: "" });
              }}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
            >
              <option value="">Selecciona una sede</option>
              <option value="CENTRAL">CENTRAL</option>
              <option value="LINCE">LINCE</option>
              <option value="LOS OLIVOS">LOS OLIVOS</option>
              <option value="SJM">SJM</option>
              <option value="VMT">VMT</option>
              <option value="PACHACAMAC">PACHACAMAC</option>
              <option value="SJL">SJL</option>
              <option value="CHORRILLOS">CHORRILLOS</option>
              <option value="SURCO">SURCO</option>
              <option value="MIRAFLORES">MIRAFLORES</option>
              <option value="VES">VES</option>
            </select>
          </div>

          {(formData.type === "asistencias" || formData.type === "conferencia") && (
            <>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.attended}
                  onChange={(e) => setFormData({ ...formData, attended: e.target.checked })}
                  className="w-4 h-4 text-blue-800 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Asistí ese día</span>
              </label>
            </div>

              {/* Sección del colíder */}
              {coLeaders && coLeaders.length > 0 && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    Colíder
                  </div>
                  
                  {/* Selector de colíder si hay más de uno */}
                  {coLeaders.length > 1 && (
                    <div>
                      <label htmlFor="coLeader" className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar colíder
                      </label>
                      <select
                        id="coLeader"
                        value={formData.coLeaderId || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            coLeaderId: e.target.value ? (e.target.value as Id<"users">) : null,
                            coLeaderAttended: undefined, // Reset cuando cambia el colíder
                          });
                        }}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                      >
                        <option value="">Ninguno</option>
                        {coLeaders.map((coLeader) => (
                          <option key={coLeader._id} value={coLeader._id}>
                            {coLeader.name || coLeader.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Radio buttons para asistencia del colíder */}
                  {formData.coLeaderId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ¿El colíder asistió?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="coLeaderAttended"
                            checked={formData.coLeaderAttended === true}
                            onChange={() => setFormData({ ...formData, coLeaderAttended: true })}
                            className="w-4 h-4 text-blue-800 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Sí</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="coLeaderAttended"
                            checked={formData.coLeaderAttended === false}
                            onChange={() => setFormData({ ...formData, coLeaderAttended: false })}
                            className="w-4 h-4 text-blue-800 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Si solo hay un colíder, ya está seleccionado automáticamente */}
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="maleCount" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de hombres *
            </label>
            <input
              id="maleCount"
              type="number"
              min="0"
              value={formData.maleCount}
              onChange={(e) => {
                setFormData({ ...formData, maleCount: parseInt(e.target.value) || 0 });
                setErrors({ ...errors, count: "" });
              }}
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.count
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              required
            />
          </div>

          <div>
            <label htmlFor="femaleCount" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de mujeres *
            </label>
            <input
              id="femaleCount"
              type="number"
              min="0"
              value={formData.femaleCount}
              onChange={(e) => {
                setFormData({ ...formData, femaleCount: parseInt(e.target.value) || 0 });
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
            {(formData.type === "asistencias" || formData.type === "conferencia") && formData.attended && (
              <p className="mt-1 text-xs text-gray-500">
                El total será: {formData.maleCount + formData.femaleCount + formData.kidsCount + 1} personas (incluyéndote)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="kidsCount" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de niños *
            </label>
            <input
              id="kidsCount"
              type="number"
              min="0"
              value={formData.kidsCount}
              onChange={(e) => {
                setFormData({ ...formData, kidsCount: parseInt(e.target.value) || 0 });
                setErrors({ ...errors, count: "" });
              }}
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.count
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              required
            />
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

