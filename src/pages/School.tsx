import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiPlus, HiBookOpen, HiCheck, HiCheckCircle } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import type { Id } from "../../convex/_generated/dataModel";

export default function School() {
  const myCourses = useQuery(api.courses.getMyCourses);
  const allCourses = useQuery(api.courses.getAllCourses);
  const enrollInCourses = useMutation(api.courses.enrollInCourses);
  const unenrollFromCourses = useMutation(api.courses.unenrollFromCourses);
  const toggleWeekCompletion = useMutation(api.courses.toggleWeekCompletion);
  const toggleWorkAndExam = useMutation(api.courses.toggleWorkAndExam);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Id<"courses">[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener IDs de cursos en los que ya está inscrito
  const enrolledCourseIds = myCourses?.map((course) => course?._id || "" as Id<"courses">) || [];

  // Filtrar cursos disponibles (excluir los ya inscritos)
  const availableCourses =
    allCourses?.filter((course) => !enrolledCourseIds.includes(course?._id || "" as Id<"courses">)) || [];

  const handleToggleCourse = (courseId: Id<"courses">) => {
    setSelectedCourses((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
    setErrors((prev) => ({ ...prev, courses: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (selectedCourses.length === 0) {
      setErrors({ courses: "Selecciona al menos un curso" });
      setIsSubmitting(false);
      return;
    }

    try {
      await enrollInCourses({ courseIds: selectedCourses });
      setSelectedCourses([]);
      setErrors({});
      setIsModalOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al inscribirse en los cursos";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnenroll = async (courseId: Id<"courses">) => {
    if (!confirm("¿Estás seguro de que quieres desinscribirte de este curso?")) {
      return;
    }

    try {
      await unenrollFromCourses({ courseIds: [courseId] });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al desinscribirse del curso"
      );
    }
  };

  const handleToggleWeek = async (courseId: Id<"courses">, week: number) => {
    try {
      await toggleWeekCompletion({ courseId, week });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al actualizar el progreso"
      );
    }
  };

  const handleToggleWorkAndExam = async (courseId: Id<"courses">) => {
    try {
      await toggleWorkAndExam({ courseId });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al actualizar el progreso"
      );
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCourses([]);
    setErrors({});
  };

  const handleModalOpen = () => {
    setSelectedCourses([]);
    setErrors({});
    setIsModalOpen(true);
  };

  if (myCourses === undefined || allCourses === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escuela"
        description="Cursos en los que estás inscrito"
        button={
          availableCourses.length > 0 ? (
            <Button
              onClick={handleModalOpen}
              size="lg"
              icon={<HiPlus className="h-5 w-5" />}
            >
              Agregar Cursos
            </Button>
          ) : undefined
        }
      />

      {/* Lista de cursos */}
      {myCourses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiBookOpen className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No estás inscrito en ningún curso
          </h3>
          <p className="text-gray-600 mb-6">
            {availableCourses.length > 0
              ? "Agrega cursos para comenzar tu formación."
              : "No hay cursos disponibles en este momento."}
          </p>
          {availableCourses.length > 0 && (
            <Button
              onClick={handleModalOpen}
              size="lg"
              icon={<HiPlus className="h-5 w-5" />}
            >
              Agregar tu primer curso
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myCourses.map((course) => {
            const weekStatuses = course?.weekStatuses || [];
            return (
              <div
                key={course?._id || ""}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl">
                        <HiBookOpen className="h-5 w-5 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {course?.name || ""}
                      </h3>
                    </div>
                    {course?.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {course?.description || ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progreso de semanas */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Progreso Semanal
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {weekStatuses.map((weekStatus) => {
                      const { week, status, isCompleted } = weekStatus;
                      const getStatusStyles = () => {
                        if (status === "al-dia") {
                          return {
                            bg: "bg-green-50",
                            border: "border-green-300",
                            text: "text-green-700",
                            chip: "bg-green-100 text-green-700",
                            chipText: "AL DÍA",
                          };
                        } else if (status === "atrasado") {
                          return {
                            bg: "bg-red-50",
                            border: "border-red-300",
                            text: "text-red-700",
                            chip: "bg-red-100 text-red-700",
                            chipText: "ATRASADO",
                          };
                        } else {
                          return {
                            bg: "bg-gray-50",
                            border: "border-gray-200",
                            text: "text-gray-600",
                            chip: "bg-gray-100 text-gray-600",
                            chipText: "PENDIENTE",
                          };
                        }
                      };

                      const styles = getStatusStyles();

                      return (
                        <button
                          key={week}
                          onClick={() => handleToggleWeek(course?._id || "" as Id<"courses">, week)}
                          className={`relative p-3 rounded-xl border-2 transition-all hover:scale-105 ${styles.bg} ${styles.border} ${styles.text}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {isCompleted ? (
                              <HiCheckCircle className="h-5 w-5" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-current" />
                            )}
                            <span className="text-xs font-semibold">
                              Semana {week}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.chip}`}
                            >
                              {styles.chipText}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trabajo y Examen */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Trabajo y Examen
                  </h4>
                  <button
                    onClick={() => handleToggleWorkAndExam(course?._id || "" as Id<"courses">)}
                    className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                      course?.completedWorkAndExam
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {course?.completedWorkAndExam ? (
                          <HiCheckCircle className="h-6 w-6" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-current" />
                        )}
                        <span className="font-semibold">Trabajo y Examen</span>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          course?.completedWorkAndExam
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {course?.completedWorkAndExam ? "COMPLETADO" : "PENDIENTE"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Botón para desinscribirse */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleUnenroll(course?._id || "" as Id<"courses">)}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Desinscribirse
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón para agregar más cursos si ya tiene algunos */}
      {myCourses.length > 0 && availableCourses.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleModalOpen}
            variant="secondary"
            size="lg"
            icon={<HiPlus className="h-5 w-5" />}
          >
            Agregar Más Cursos
          </Button>
        </div>
      )}

      {/* Modal para agregar cursos */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Agregar Cursos"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {availableCourses.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
                <HiBookOpen className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay cursos disponibles
              </h3>
              <p className="text-gray-600">
                Ya estás inscrito en todos los cursos disponibles o no hay cursos
                creados aún.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecciona los cursos a los que deseas inscribirte
                </label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableCourses.map((course) => {
                    const isSelected = selectedCourses.includes(course?._id || "" as Id<"courses">);
                    return (
                      <button
                        key={course?._id || ""}
                        type="button"
                        onClick={() => handleToggleCourse(course?._id || "" as Id<"courses">)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50"
                            : "border-gray-200 hover:border-sky-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isSelected && (
                                <HiCheck className="h-5 w-5 text-sky-500 flex-shrink-0" />
                              )}
                              <h4 className="font-semibold text-gray-900">
                                {course?.name || ""}
                              </h4>
                            </div>
                            {course?.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {course?.description || ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.courses && (
                  <p className="mt-2 text-sm text-red-500">{errors.courses}</p>
                )}
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
                  onClick={handleModalClose}
                  variant="outline"
                  rounded="xl"
                  fullWidth
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedCourses.length === 0}
                  rounded="xl"
                  fullWidth
                >
                  {isSubmitting ? "Inscribiendo..." : "Inscribirse"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}

