import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  HiUsers,
  HiCalendar,
  HiAcademicCap,
  HiPlus,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
import type { Id } from "../../convex/_generated/dataModel";

// Componente para la vista de calendario de actividades
function ActivitiesCalendarView({
  activities,
  onActivityClick,
}: {
  activities: Array<{
    _id: Id<"activities">;
    name: string;
    address: string;
    dateTime: number;
    activityType: "leader" | "disciple";
    groupName: string;
  }>;
  onActivityClick: (activityId: Id<"activities">) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Nombres de los días de la semana
  const weekDays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  // Obtener el primer día del mes y el número de días
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Obtener el día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
  // Ajustar para que lunes sea 0
  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Obtener días del mes anterior para completar la primera semana
  const prevMonth = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  const prevMonthDays: number[] = [];
  if (firstDayOfWeek > 0) {
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push(daysInPrevMonth - i);
    }
  }

  // Obtener días del mes siguiente para completar la última semana
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const nextMonthDays: number[] = [];
  const remainingCells = totalCells - (firstDayOfWeek + daysInMonth);
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(i);
  }

  // Agrupar actividades por fecha (solo día del mes, sin hora)
  const activitiesByDate = activities.reduce(
    (acc, activity) => {
      const date = new Date(activity.dateTime);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push(activity);
      return acc;
    },
    {} as Record<string, typeof activities>
  );

  // Función para obtener actividades de un día específico
  const getActivitiesForDate = (
    day: number,
    isCurrentMonth: boolean,
    isPrevMonth: boolean
  ) => {
    if (!isCurrentMonth) {
      const checkDate = isPrevMonth
        ? new Date(year, month - 1, day)
        : new Date(year, month + 1, day);
      const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      return activitiesByDate[dateKey] || [];
    }
    const dateKey = `${year}-${month}-${day}`;
    return activitiesByDate[dateKey] || [];
  };

  // Verificar si un día es hoy
  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Navegación de meses
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Formatear nombre del mes y año
  const monthName = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  // Función para obtener la hora formateada
  const getTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Navegación del calendario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Mes anterior"
          >
            <HiChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="text-xl font-semibold text-gray-900 capitalize">
            {monthName}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Mes siguiente"
          >
            <HiChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Encabezados de días de la semana */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-semibold text-gray-600 uppercase bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7">
          {/* Días del mes anterior */}
          {prevMonthDays.map((day, index) => {
            const dayActivities = getActivitiesForDate(day, false, true);
            const dayIndex = index;
            const isLastColumn = (dayIndex + 1) % 7 === 0;
            return (
              <div
                key={`prev-${day}`}
                className={`min-h-[120px] border-b border-gray-200 p-2 bg-gray-50 ${
                  !isLastColumn ? "border-r" : ""
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">{day}</div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, 4).map((activity) => (
                    <div
                      key={activity._id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                        activity.activityType === "leader"
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                      }`}
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                    >
                      <span className="font-medium">
                        {getTime(activity.dateTime)}
                      </span>{" "}
                      {activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 4 && (
                    <div className="text-xs text-gray-500 font-medium px-1.5">
                      +{dayActivities.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Días del mes actual */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
            (day, dayMapIndex) => {
              const dayActivities = getActivitiesForDate(day, true, false);
              const today = isToday(day, true);
              const dayIndex = prevMonthDays.length + dayMapIndex;
              const isLastColumn = (dayIndex + 1) % 7 === 0;

              return (
                <div
                  key={day}
                  className={`min-h-[120px] border-b border-gray-200 p-2 hover:bg-gray-50 transition-colors ${
                    today ? "bg-blue-50" : ""
                  } ${!isLastColumn ? "border-r" : ""}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 inline-flex items-center justify-center ${
                      today
                        ? "w-7 h-7 rounded-full bg-blue-600 text-white"
                        : "text-gray-900"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayActivities.slice(0, 4).map((activity) => (
                      <div
                        key={activity._id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                          activity.activityType === "leader"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                        }`}
                        onClick={() => onActivityClick(activity._id)}
                        title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                      >
                        <span className="font-medium">
                          {getTime(activity.dateTime)}
                        </span>{" "}
                        {activity.name}
                      </div>
                    ))}
                    {dayActivities.length > 4 && (
                      <div className="text-xs text-gray-500 font-medium px-1.5">
                        +{dayActivities.length - 4} más
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}

          {/* Días del mes siguiente */}
          {nextMonthDays.map((day, index) => {
            const dayActivities = getActivitiesForDate(day, false, false);
            const dayIndex = prevMonthDays.length + daysInMonth + index;
            const isLastColumn = (dayIndex + 1) % 7 === 0;
            return (
              <div
                key={`next-${day}`}
                className={`min-h-[120px] border-b border-gray-200 p-2 bg-gray-50 ${
                  !isLastColumn ? "border-r" : ""
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">{day}</div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, 4).map((activity) => (
                    <div
                      key={activity._id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                        activity.activityType === "leader"
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                      }`}
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                    >
                      <span className="font-medium">
                        {getTime(activity.dateTime)}
                      </span>{" "}
                      {activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 4 && (
                    <div className="text-xs text-gray-500 font-medium px-1.5">
                      +{dayActivities.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Componente para la sección de calendario de actividades
function ActivitiesCalendarSection() {
  const myActivities = useQuery(api.activities.getMyActivities);
  const [selectedActivityId, setSelectedActivityId] = useState<
    Id<"activities"> | null
  >(null);
  const activityDetails = useQuery(
    api.activities.getActivityWithResponses,
    selectedActivityId ? { activityId: selectedActivityId } : "skip"
  );

  if (myActivities === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (myActivities.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Calendario de Actividades
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <HiCalendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay actividades
          </h3>
          <p className="text-gray-600">
            No tienes actividades programadas en tus grupos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Calendario de Actividades
        </h2>
      </div>

      {/* Leyenda */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
            <span className="text-sm text-gray-700 font-medium">
              Actividades como Líder
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
            <span className="text-sm text-gray-700 font-medium">
              Actividades como Discípulo
            </span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <ActivitiesCalendarView
          activities={myActivities}
          onActivityClick={setSelectedActivityId}
        />
      </div>

      {/* Modal de detalles de actividad */}
      {selectedActivityId && activityDetails && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedActivityId(null)}
          title={activityDetails.activity.name}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Grupo
              </h3>
              <p className="text-gray-900">{activityDetails.group.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Fecha y Hora
              </h3>
              <p className="text-gray-900">
                {new Date(activityDetails.activity.dateTime).toLocaleString(
                  "es-ES",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Dirección
              </h3>
              <p className="text-gray-900">
                {activityDetails.activity.address}
              </p>
            </div>
            {activityDetails.activity.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </h3>
                <div
                  className="text-gray-900 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: activityDetails.activity.description,
                  }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function Home() {
  const dashboard = useQuery(api.users.getDashboard);
  const myReport = useQuery(
    api.attendance.getMyMonthlyReport,
    getCurrentMonthArgs()
  );
  const groupReport = useQuery(
    api.attendance.getGroupAttendanceReport,
    getCurrentMonthArgs()
  );
  const recordAttendance = useMutation(api.attendance.recordAttendance);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalType, setModalType] = useState<
    "nuevos_asistentes" | "reset" | "conferencia" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Formulario de registro
  const [formData, setFormData] = useState({
    date: "",
    attended: false,
    count: 0,
  });

  // Actualizar reportes cuando cambia el mes/año
  const monthReport = useQuery(
    api.attendance.getMyMonthlyReport,
    selectedMonth && selectedYear
      ? { month: selectedMonth, year: selectedYear }
      : "skip"
  );
  const monthGroupReport = useQuery(
    api.attendance.getGroupAttendanceReport,
    selectedMonth && selectedYear
      ? { month: selectedMonth, year: selectedYear }
      : "skip"
  );

  // Helper para obtener mes y año actual
  function getCurrentMonth(): number {
    return new Date().getMonth() + 1;
  }

  function getCurrentMonthArgs() {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }

  // Helper para convertir timestamp a formato de fecha (YYYY-MM-DD)
  const timestampToDateString = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper para convertir formato de fecha (YYYY-MM-DD) a timestamp
  const dateStringToTimestamp = (dateString: string): number => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    return date.getTime();
  };

  // Helper para verificar si una fecha es domingo
  const isSunday = (dateString: string): boolean => {
    const timestamp = dateStringToTimestamp(dateString);
    const date = new Date(timestamp);
    return date.getDay() === 0;
  };

  // Abrir modal de registro
  const handleOpenModal = (type: "nuevos_asistentes" | "reset" | "conferencia") => {
    setModalType(type);
    setFormData({
      date: timestampToDateString(Date.now()),
      attended: false,
      count: 0,
    });
    setErrors({});
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalType(null);
    setFormData({
      date: timestampToDateString(Date.now()),
      attended: false,
      count: 0,
    });
    setErrors({});
  };

  // Manejar cambio de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setFormData({ ...formData, date: newDate });

    // Validar domingo para nuevos_asistentes
    if (modalType === "nuevos_asistentes" && !isSunday(newDate)) {
      setErrors({
        date: "Los nuevos asistentes solo se pueden registrar los domingos",
      });
    } else {
      setErrors({});
    }
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validaciones
    if (!formData.date) {
      setErrors({ date: "Selecciona una fecha" });
      setIsSubmitting(false);
      return;
    }

    if (modalType === "nuevos_asistentes" && !isSunday(formData.date)) {
      setErrors({
        date: "Los nuevos asistentes solo se pueden registrar los domingos",
      });
      setIsSubmitting(false);
      return;
    }

    if (
      modalType === "nuevos_asistentes" &&
      formData.attended === undefined
    ) {
      setErrors({ attended: "Indica si asististe o no" });
      setIsSubmitting(false);
      return;
    }

    if (formData.count < 0) {
      setErrors({ count: "La cantidad debe ser un número positivo" });
      setIsSubmitting(false);
      return;
    }

    try {
      await recordAttendance({
        date: dateStringToTimestamp(formData.date),
        type: modalType!,
        attended:
          modalType === "nuevos_asistentes"
            ? formData.attended
            : undefined,
        count: formData.count,
      });

      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al registrar asistencia";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navegar entre meses
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  if (dashboard === undefined || myReport === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentReport = monthReport || myReport;
  const currentGroupReport = monthGroupReport || groupReport;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Gestiona tus contadores y revisa tus reportes
          </p>
        </div>

        {/* Contadores Personales - Mes Actual */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Contadores del Mes Actual
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
              >
                <HiChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  selectedMonth === getCurrentMonth() &&
                  selectedYear === new Date().getFullYear()
                }
              >
                <HiChevronRight
                  className={`h-5 w-5 ${
                    selectedMonth === getCurrentMonth() &&
                    selectedYear === new Date().getFullYear()
                      ? "text-gray-300"
                      : "text-gray-600"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nuevos Asistentes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <HiUsers className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Nuevos Asistentes
                    </h3>
                    <p className="text-sm text-gray-500">Solo domingos</p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {currentReport?.nuevos_asistentes.total || 0}
                </div>
                <div className="text-sm text-gray-600">
                  personas
                </div>
              </div>
              <button
                onClick={() => handleOpenModal("nuevos_asistentes")}
                className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <HiPlus className="h-5 w-5" />
                Registrar
              </button>
            </div>

            {/* RESET */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <HiAcademicCap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">RESET</h3>
                    <p className="text-sm text-gray-500">Personas enviadas</p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {currentReport?.reset.total || 0}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>personas</div>
                 
                </div>
              </div>
              <button
                onClick={() => handleOpenModal("reset")}
                className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-medium hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
              >
                <HiPlus className="h-5 w-5" />
                Registrar
              </button>
            </div>

            {/* Conferencia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <HiCalendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Conferencia</h3>
                    <p className="text-sm text-gray-500">Asistencia y nuevos</p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {currentReport?.conferencia.total || 0}
                </div>
                <div className="text-sm text-gray-600">
                  personas
                </div>
              </div>
              <button
                onClick={() => handleOpenModal("conferencia")}
                className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-medium hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              >
                <HiPlus className="h-5 w-5" />
                Registrar
              </button>
            </div>
          </div>
        </div>

        {/* Reportes de Grupo (Solo para Líderes) */}
        {currentGroupReport?.isLeader && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Reporte de Grupo - {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Nuevos Asistentes - Grupo */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HiUsers className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      Nuevos Asistentes
                    </h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {currentGroupReport.groupReport?.nuevos_asistentes.total || 0}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Tuyos: {currentGroupReport.groupReport?.nuevos_asistentes.myTotal || 0}
                    </div>
                    <div>
                      Discípulos:{" "}
                      {currentGroupReport.groupReport?.nuevos_asistentes.disciplesTotal || 0}
                    </div>
                    <div className="flex gap-3 text-xs mt-2 font-medium">
                      <span className="text-gray-700">
                        👨 {currentGroupReport.groupReport?.nuevos_asistentes.male || 0} hombres
                      </span>
                      <span className="text-rose-700">
                        👩 {currentGroupReport.groupReport?.nuevos_asistentes.female || 0} mujeres
                      </span>
                    </div>
                  </div>
                </div>

                {/* RESET - Grupo */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HiAcademicCap className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">RESET</h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {currentGroupReport.groupReport?.reset.total || 0}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Tuyos: {currentGroupReport.groupReport?.reset.myTotal || 0}
                    </div>
                    <div>
                      Discípulos:{" "}
                      {currentGroupReport.groupReport?.reset.disciplesTotal || 0}
                    </div>
                    <div className="flex gap-3 text-xs mt-2 font-medium">
                      <span className="text-gray-700">
                        👨 {currentGroupReport.groupReport?.reset.male || 0} hombres
                      </span>
                      <span className="text-rose-700">
                        👩 {currentGroupReport.groupReport?.reset.female || 0} mujeres
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conferencia - Grupo */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HiCalendar className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Conferencia</h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {currentGroupReport.groupReport?.conferencia.total || 0}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Tuyos: {currentGroupReport.groupReport?.conferencia.myTotal || 0}
                    </div>
                    <div>
                      Discípulos:{" "}
                      {currentGroupReport.groupReport?.conferencia.disciplesTotal || 0}
                    </div>
                    <div className="flex gap-3 text-xs mt-2 font-medium">
                      <span className="text-gray-700">
                        👨 {currentGroupReport.groupReport?.conferencia.male || 0} hombres
                      </span>
                      <span className="text-rose-700">
                        👩 {currentGroupReport.groupReport?.conferencia.female || 0} mujeres
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendario de Actividades */}
        <ActivitiesCalendarSection />

        {/* Modales de Registro */}
        {modalType && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            title={
              modalType === "nuevos_asistentes"
                ? "Registrar Nuevos Asistentes"
                : modalType === "reset"
                ? "Registrar RESET"
                : "Registrar Conferencia"
            }
            maxWidth="md"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                  {modalType === "nuevos_asistentes" && (
                    <span className="text-red-500 ml-1">* (Solo domingos)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.date
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              {/* Asistencia (solo para nuevos_asistentes) */}
              {modalType === "nuevos_asistentes" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Asististe?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="attended"
                        checked={formData.attended === true}
                        onChange={() =>
                          setFormData({ ...formData, attended: true })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700">Sí</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="attended"
                        checked={formData.attended === false}
                        onChange={() =>
                          setFormData({ ...formData, attended: false })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700">No</span>
                    </label>
                  </div>
                  {errors.attended && (
                    <p className="mt-1 text-sm text-red-600">{errors.attended}</p>
                  )}
                </div>
              )}

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalType === "reset"
                    ? "Cantidad de personas enviadas"
                    : "Cantidad de nuevas personas"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      count: parseInt(e.target.value) || 0,
                    })
                  }
                  className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.count
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.count && (
                  <p className="mt-1 text-sm text-red-600">{errors.count}</p>
                )}
              </div>

              {/* Error general */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
