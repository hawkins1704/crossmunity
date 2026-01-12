import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiPlus, HiBookOpen, HiPencil, HiTrash } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import type { Id } from "../../convex/_generated/dataModel";

export default function CoursesAdmin() {
  const courses = useQuery(api.courses.getAllCourses);
  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const deleteCourse = useMutation(api.courses.deleteCourse);
  const profile = useQuery(api.users.getMyProfile);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Id<"courses"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    durationWeeks: "9",
  });

  // Verificar que el usuario sea admin
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Acceso Denegado
          </h3>
          <p className="text-gray-600">
            Solo los administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      durationWeeks: "9",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: {
    _id: Id<"courses">;
    name: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    durationWeeks?: number;
  }) => {
    setEditingCourse(course._id);
    // Convertir timestamps a formato de fecha (YYYY-MM-DD) en zona horaria local
    let startDateStr = "";
    let endDateStr = "";
    
    if (course.startDate) {
      const startDateObj = new Date(course.startDate);
      const year = startDateObj.getFullYear();
      const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(startDateObj.getDate()).padStart(2, '0');
      startDateStr = `${year}-${month}-${day}`;
    }
    
    if (course.endDate) {
      const endDateObj = new Date(course.endDate);
      const year = endDateObj.getFullYear();
      const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(endDateObj.getDate()).padStart(2, '0');
      endDateStr = `${year}-${month}-${day}`;
    }
    
    // Calcular duración si hay fechas
    let calculatedWeeks = "9";
    if (startDateStr && endDateStr) {
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      calculatedWeeks = Math.ceil(diffDays / 7).toString();
    }
    
    setFormData({
      name: course.name,
      description: course.description || "",
      startDate: startDateStr,
      endDate: endDateStr,
      durationWeeks: calculatedWeeks,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      durationWeeks: "9",
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validaciones
    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setErrors({
        dates: "Debes especificar fecha de inicio y fin del curso",
      });
      setIsSubmitting(false);
      return;
    }

    // Convertir fechas a inicio del día (sin hora) en zona horaria local
    // Parsear la fecha manualmente para evitar problemas de zona horaria
    const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
    const startDateObj = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const startDate = startDateObj.getTime();
    
    const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
    const endDateObj = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
    const endDate = endDateObj.getTime();

    if (startDate >= endDate) {
      setErrors({
        dates: "La fecha de inicio debe ser anterior a la fecha de fin",
      });
      setIsSubmitting(false);
      return;
    }

    // Calcular duración automáticamente
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const durationWeeks = Math.ceil(diffDays / 7);

    try {
      if (editingCourse) {
        // Actualizar curso
        await updateCourse({
          courseId: editingCourse,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          startDate,
          endDate,
          durationWeeks,
        });
      } else {
        // Crear curso
        await createCourse({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          startDate,
          endDate,
          durationWeeks,
        });
      }
      handleCloseModal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al guardar el curso";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (courseId: Id<"courses">) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este curso? Esta acción eliminará todos los registros de progreso asociados."
      )
    ) {
      return;
    }

    try {
      await deleteCourse({ courseId });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al eliminar el curso"
      );
    }
  };

  if (courses === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Gestiona los cursos disponibles"
        button={
          <Button
            onClick={handleOpenCreateModal}
            size="lg"
            icon={<HiPlus className="h-5 w-5" />}
          >
            Crear Curso
          </Button>
        }
      />

      {/* Lista de cursos */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiBookOpen className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay cursos creados
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primer curso para comenzar.
          </p>
          <Button
            onClick={handleOpenCreateModal}
            size="lg"
            icon={<HiPlus className="h-5 w-5" />}
          >
            Crear tu primer curso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl">
                      <HiBookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {course.name}
                    </h3>
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {course.description}
                    </p>
                  )}
                  {course.startDate && course.endDate && (
                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Inicio:</span>{" "}
                        {new Date(course.startDate).toLocaleDateString("es-PE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p>
                        <span className="font-medium">Fin:</span>{" "}
                        {new Date(course.endDate).toLocaleDateString("es-PE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {course.durationWeeks && (
                        <p>
                          <span className="font-medium">Duración:</span>{" "}
                          {course.durationWeeks} semana
                          {course.durationWeeks !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenEditModal(course)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <HiPencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(course._id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <HiTrash className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear/editar curso */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCourse ? "Editar Curso" : "Crear Nuevo Curso"}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Curso *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              placeholder="Ej: Fundamentos de la Fe"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
              }}
              rows={3}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              placeholder="Descripción del curso..."
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Fecha de Inicio *
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  let newDurationWeeks = formData.durationWeeks;
                  
                  // Calcular duración si ambas fechas están presentes
                  if (newStartDate && formData.endDate) {
                    const [startYear, startMonth, startDay] = newStartDate.split('-').map(Number);
                    const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
                    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
                    const end = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    newDurationWeeks = Math.ceil(diffDays / 7).toString();
                  }
                  
                  setFormData({ 
                    ...formData, 
                    startDate: newStartDate,
                    durationWeeks: newDurationWeeks,
                  });
                  setErrors({ ...errors, dates: "" });
                }}
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.dates
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                required
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Fecha de Fin *
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  let newDurationWeeks = formData.durationWeeks;
                  
                  // Calcular duración si ambas fechas están presentes
                  if (formData.startDate && newEndDate) {
                    const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
                    const [endYear, endMonth, endDay] = newEndDate.split('-').map(Number);
                    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
                    const end = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    newDurationWeeks = Math.ceil(diffDays / 7).toString();
                  }
                  
                  setFormData({ 
                    ...formData, 
                    endDate: newEndDate,
                    durationWeeks: newDurationWeeks,
                  });
                  setErrors({ ...errors, dates: "" });
                }}
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.dates
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                required
              />
            </div>
          </div>
          {errors.dates && (
            <p className="text-sm text-red-500 -mt-3">{errors.dates}</p>
          )}

          {/* Duración en semanas */}
          <div>
            <label
              htmlFor="durationWeeks"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Duración en Semanas *
            </label>
            <input
              id="durationWeeks"
              type="number"
              min="1"
              max="52"
              value={formData.durationWeeks}
              disabled
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se calcula automáticamente según las fechas de inicio y fin
            </p>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
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
              {isSubmitting
                ? editingCourse
                  ? "Guardando..."
                  : "Creando..."
                : editingCourse
                ? "Guardar Cambios"
                : "Crear Curso"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

