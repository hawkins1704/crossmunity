import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiPlus, HiBookOpen, HiCheck, HiCheckCircle } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
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
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
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
            <button
              onClick={handleModalOpen}
              className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
            >
              <HiPlus className="h-5 w-5" />
              Agregar Cursos
            </button>
          ) : undefined
        }
      />

      {/* Lista de cursos */}
      {myCourses.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
            <HiBookOpen className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
            No estás inscrito en ningún curso
          </h3>
          <p className="text-sm font-normal text-[#666666] mb-8">
            {availableCourses.length > 0
              ? "Agrega cursos para comenzar tu formación."
              : "No hay cursos disponibles en este momento."}
          </p>
          {availableCourses.length > 0 && (
            <button
              onClick={handleModalOpen}
              className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
            >
              <HiPlus className="h-5 w-5" />
              Agregar tu primer curso
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myCourses.map((course) => {
            const weekStatuses = course?.weekStatuses || [];
            return (
              <div
                key={course?._id || ""}
                className="bg-white border border-[#e5e5e5] p-6 hover:border-black transition-colors"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-50">
                        <HiBookOpen className="h-5 w-5 text-blue-700" />
                      </div>
                      <h3 className="text-xl font-normal text-black tracking-tight">
                        {course?.name || ""}
                      </h3>
                    </div>
                    {course?.description && (
                      <p className="text-sm font-normal text-[#666666] mt-2">
                        {course?.description || ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progreso de semanas */}
                <div className="mb-6">
                  <h4 className="text-sm font-normal text-black mb-3 uppercase tracking-wide">
                    Progreso Semanal
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {weekStatuses.map((weekStatus) => {
                      const { week, status, isCompleted } = weekStatus;
                      const getStatusStyles = () => {
                        if (status === "al-dia") {
                          return {
                            bg: "bg-green-50",
                            border: "border-green-200",
                            text: "text-black",
                            chip: "bg-green-50 border-green-200 text-black",
                            chipText: "AL DÍA",
                          };
                        } else if (status === "atrasado") {
                          return {
                            bg: "bg-red-50",
                            border: "border-red-200",
                            text: "text-black",
                            chip: "bg-red-50 border-red-200 text-black",
                            chipText: "ATRASADO",
                          };
                        } else {
                          return {
                            bg: "bg-[#fafafa]",
                            border: "border-[#e5e5e5]",
                            text: "text-black",
                            chip: "bg-[#fafafa] border-[#e5e5e5] text-black",
                            chipText: "PENDIENTE",
                          };
                        }
                      };

                      const styles = getStatusStyles();

                      return (
                        <button
                          key={week}
                          onClick={() => handleToggleWeek(course?._id || "" as Id<"courses">, week)}
                          className={`relative p-3 border transition-colors hover:bg-[#fafafa] ${styles.bg} ${styles.border} ${styles.text}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {isCompleted ? (
                              <HiCheckCircle className="h-5 w-5" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-current" />
                            )}
                            <span className="text-xs font-normal">
                              Semana {week}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 border font-normal ${styles.chip}`}
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
                  <h4 className="text-sm font-normal text-black mb-3 uppercase tracking-wide">
                    Trabajo y Examen
                  </h4>
                  <button
                    onClick={() => handleToggleWorkAndExam(course?._id || "" as Id<"courses">)}
                    className={`w-full p-4 border transition-colors hover:bg-[#fafafa] ${
                      course?.completedWorkAndExam
                        ? "bg-green-50 border-green-200 text-black"
                        : "bg-[#fafafa] border-[#e5e5e5] text-black"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {course?.completedWorkAndExam ? (
                          <HiCheckCircle className="h-6 w-6" />
                        ) : (
                          <div className="h-6 w-6 border-2 border-current" />
                        )}
                        <span className="font-normal text-sm">Trabajo y Examen</span>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 border font-normal ${
                          course?.completedWorkAndExam
                            ? "bg-green-50 border-green-200 text-black"
                            : "bg-[#fafafa] border-[#e5e5e5] text-black"
                        }`}
                      >
                        {course?.completedWorkAndExam ? "COMPLETADO" : "PENDIENTE"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Botón para desinscribirse */}
                <div className="pt-4 border-t border-[#e5e5e5]">
                  <button
                    onClick={() => handleUnenroll(course?._id || "" as Id<"courses">)}
                    className="w-full px-4 py-2 text-sm font-normal text-black border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
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
          <button
            onClick={handleModalOpen}
            className="inline-flex items-center gap-2 bg-white text-black py-3 px-6 border border-[#e5e5e5] font-normal text-sm hover:bg-[#fafafa] transition-colors"
          >
            <HiPlus className="h-5 w-5" />
            Agregar Más Cursos
          </button>
        </div>
      )}

      {/* Modal para agregar cursos */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Agregar Cursos"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {availableCourses.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
                <HiBookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
                No hay cursos disponibles
              </h3>
              <p className="text-sm font-normal text-[#666666]">
                Ya estás inscrito en todos los cursos disponibles o no hay cursos
                creados aún.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-normal text-black mb-3 uppercase tracking-wide">
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
                        className={`w-full text-left p-4 border transition-colors ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-[#e5e5e5] hover:bg-[#fafafa] text-black"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isSelected && (
                                <HiCheck className="h-5 w-5 text-white flex-shrink-0" />
                              )}
                              <h4 className={`font-normal text-sm ${
                                isSelected ? "text-white" : "text-black"
                              }`}>
                                {course?.name || ""}
                              </h4>
                            </div>
                            {course?.description && (
                              <p className={`text-sm font-normal mt-1 ${
                                isSelected ? "text-white" : "text-[#666666]"
                              }`}>
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
                  <p className="mt-2 text-xs text-[#d32f2f]">{errors.courses}</p>
                )}
              </div>

              {/* Error general */}
              {errors.submit && (
                <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
                  <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-3 px-4 border border-[#e5e5e5] text-black font-normal text-sm hover:bg-[#fafafa] transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedCourses.length === 0}
                  className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
                >
                  {isSubmitting ? "Inscribiendo..." : "Inscribirse"}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}

