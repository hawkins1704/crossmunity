import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import PageHeader from "../components/PageHeader";
import {
  HiUsers,
  HiLocationMarker,
  HiCalendar,
  HiClock,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiViewList,
  HiViewGrid,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
import type { Id } from "../../convex/_generated/dataModel";

const HiPending = HiClock;

// Componente para la vista de calendario de actividades (tipo Google Calendar)
function ActivitiesCalendarView({
  activities,
  isLeader,
  onActivityClick,
  ActivityResponseButtons,
}: {
  activities: Array<{
    _id: Id<"activities">;
    name: string;
    address: string;
    dateTime: number;
  }>;
  isLeader: boolean;
  onActivityClick: (activityId: Id<"activities">) => void;
  ActivityResponseButtons: React.ComponentType<{ activityId: Id<"activities"> }>;
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
  const activitiesByDate = activities.reduce((acc, activity) => {
    const date = new Date(activity.dateTime);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  // Función para obtener actividades de un día específico
  const getActivitiesForDate = (day: number, isCurrentMonth: boolean, isPrevMonth: boolean) => {
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
    year: "numeric" 
  });

  // Función para obtener la hora formateada
  const getTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("es-ES", { 
      hour: "2-digit", 
      minute: "2-digit" 
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
                      className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-medium">{getTime(activity.dateTime)}</span> {activity.name}
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
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day, dayMapIndex) => {
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
                        isLeader
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-medium">{getTime(activity.dateTime)}</span> {activity.name}
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
                      className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-medium">{getTime(activity.dateTime)}</span> {activity.name}
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

// Componente para los botones de respuesta de actividad
function ActivityResponseButtons({ activityId }: { activityId: Id<"activities"> }) {
  const myResponse = useQuery(api.activities.getMyActivityResponse, { activityId });
  const respondToActivity = useMutation(api.activities.respondToActivity);

  const handleRespond = async (status: "confirmed" | "denied") => {
    try {
      await respondToActivity({ activityId, status });
    } catch (error) {
      console.error("Error al responder:", error);
    }
  };

  return (
    <div className="flex flex-col items-start md:items-end gap-2 md:ml-4 w-full md:w-auto">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRespond("confirmed");
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm flex-1 md:flex-initial ${
            myResponse?.status === "confirmed"
              ? "bg-green-100 text-green-700 border-2 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 border-2 border-transparent"
          }`}
          title="Confirmar asistencia"
        >
          <HiCheckCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Confirmar</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRespond("denied");
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm flex-1 md:flex-initial ${
            myResponse?.status === "denied"
              ? "bg-red-100 text-red-700 border-2 border-red-300"
              : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 border-2 border-transparent"
          }`}
          title="No asistiré"
        >
          <HiXCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">No asistiré</span>
        </button>
      </div>
      {myResponse?.status && (
        <span className="text-xs text-gray-500 md:text-right w-full md:w-auto">
          {myResponse.status === "confirmed" && "✓ Confirmado"}
          {myResponse.status === "denied" && "✗ No asistirás"}
        </span>
      )}
    </div>
  );
}

export default function MyGroup() {
  const group = useQuery(api.groups.getGroupAsDisciple);
  const joinGroup = useMutation(api.groups.joinGroup);
  
  // Obtener actividades del grupo si existe
  const activities = useQuery(
    api.activities.getActivitiesByGroup,
    group?._id ? { groupId: group._id } : "skip"
  );

  const [selectedActivityId, setSelectedActivityId] = useState<Id<"activities"> | null>(null);

  // Obtener detalles de actividad seleccionada
  const activityDetails = useQuery(
    api.activities.getActivityWithResponses,
    selectedActivityId ? { activityId: selectedActivityId } : "skip"
  );

  const [invitationCode, setInvitationCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activitiesView, setActivitiesView] = useState<"list" | "calendar">("list");

  const handleJoinGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsJoining(true);
    setError(null);
    setSuccess(false);

    const code = invitationCode.trim().toUpperCase();

    if (!code || code.length !== 6) {
      setError("El código de invitación debe tener 6 caracteres");
      setIsJoining(false);
      return;
    }

    try {
      await joinGroup({ invitationCode: code });
      setSuccess(true);
      setInvitationCode("");
      // El grupo se actualizará automáticamente con la query
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al unirse al grupo";
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };


  // Solo mostrar loading si está cargando el grupo
  // Si group es null, no esperamos activities porque no hay grupo
  if (group === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Si el usuario NO pertenece a ningún grupo, mostrar formulario para unirse
  if (!group) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi Grupo"
          description="Únete a un grupo de conexión usando un código de invitación"
        />

        {/* Card para unirse */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
              <HiUsers className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No perteneces a ningún grupo
            </h2>
            <p className="text-gray-600">
              Pide el código de invitación a un líder de grupo para unirte
            </p>
          </div>

          {/* Formulario para unirse */}
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label
                htmlFor="invitationCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Código de Invitación
              </label>
              <div className="relative">
                <input
                  id="invitationCode"
                  type="text"
                  value={invitationCode}
                  onChange={(e) => {
                    // Convertir a mayúsculas y limitar a 6 caracteres alfanuméricos
                    const value = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6);
                    setInvitationCode(value);
                    setError(null);
                    setSuccess(false);
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className={`block w-full px-4 py-3 border rounded-xl bg-white font-mono text-lg text-center tracking-widest focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                  }`}
                  required
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <HiXCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <HiCheckCircle className="h-4 w-4" />
                  <span>¡Te has unido al grupo exitosamente!</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isJoining || invitationCode.length !== 6}
              className="w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isJoining ? "Uniéndose..." : "Unirse al Grupo"}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>¿Cómo obtener un código?</strong>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Contacta a un líder de grupo y pídele el código de invitación de 6
              caracteres. Una vez que lo tengas, ingrésalo arriba para unirte al
              grupo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si el usuario ya pertenece a un grupo
  if (group) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi Grupo"
          description="Información del grupo al que perteneces"
        />

        {/* Card del grupo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {group.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiLocationMarker className="h-4 w-4" />
                <span>{group.address}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{group.district}</p>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <HiCheckCircle className="h-4 w-4" />
              Activo
            </div>
          </div>

          {/* Información del grupo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {group.minAge && group.maxAge && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HiUser className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rango de Edad</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {group.minAge} - {group.maxAge} años
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HiCalendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Día de Reunión</p>
                <p className="text-sm font-semibold text-gray-900">
                  {group.day}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-orange-100 rounded-lg">
                <HiClock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Hora</p>
                <p className="text-sm font-semibold text-gray-900">
                  {group.time}
                </p>
              </div>
            </div>
          </div>

          {/* Líderes */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Líderes del Grupo
            </h3>
            <div className="space-y-2">
              {group.leaders
                .filter((leader): leader is NonNullable<typeof leader> => leader !== null)
                .map((leader) => (
                  <div
                    key={leader._id}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-100"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {(leader.name || leader.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {leader.name || "Sin nombre"}
                      </p>
                      {leader.email && (
                        <p className="text-xs text-gray-600">{leader.email}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {leader.gender === "Male" ? "Hombre" : "Mujer"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Otros discípulos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Otros Discípulos ({group.disciples.length})
            </h3>
            {group.disciples.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Aún no hay otros discípulos en este grupo
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.disciples
                  .filter((disciple): disciple is NonNullable<typeof disciple> => disciple !== null)
                  .map((disciple) => (
                    <div
                      key={disciple._id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 text-xs font-semibold">
                        {(disciple.name || disciple.email || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {disciple.name || "Sin nombre"}
                        </p>
                        {disciple.email && (
                          <p className="text-xs text-gray-600 truncate">
                            {disciple.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Actividades */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Actividades ({activities?.length || 0})
            </h3>
            {/* Toggle de vista */}
            {activities && activities.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActivitiesView("list")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                    activitiesView === "list"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Vista de lista"
                >
                  <HiViewList className="h-4 w-4" />
                  <span className="text-sm font-medium">Lista</span>
                </button>
                <button
                  onClick={() => setActivitiesView("calendar")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                    activitiesView === "calendar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Vista de calendario"
                >
                  <HiViewGrid className="h-4 w-4" />
                  <span className="text-sm font-medium">Calendario</span>
                </button>
              </div>
            )}
          </div>
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Aún no hay actividades en este grupo
            </p>
          ) : activitiesView === "list" ? (
            <div className="space-y-3">
              {activities.map((activity) => {
                const dateTime = formatDateTime(activity.dateTime);

                return (
                  <div
                    key={activity._id}
                    className="p-4 rounded-xl border-2 border-gray-200 transition-all cursor-pointer hover:border-blue-300 hover:shadow-md"
                    onClick={() => setSelectedActivityId(activity._id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          {activity.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <HiLocationMarker className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{activity.address}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <HiCalendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{dateTime.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HiClock className="h-4 w-4 flex-shrink-0" />
                            <span>{dateTime.time}</span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="flex-shrink-0 md:ml-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActivityResponseButtons activityId={activity._id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ActivitiesCalendarView
              activities={activities}
              isLeader={false}
              onActivityClick={(activityId) => setSelectedActivityId(activityId)}
              ActivityResponseButtons={ActivityResponseButtons}
            />
          )}
        </div>

        {/* Modal para detalles de actividad */}
        {activityDetails && selectedActivityId && (
          <Modal
            isOpen={!!selectedActivityId}
            onClose={() => setSelectedActivityId(null)}
            title={activityDetails.activity.name}
            maxWidth="xl"
          >
            <div className="space-y-6">
              {/* Información de la actividad */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiLocationMarker className="h-4 w-4" />
                  <span>{activityDetails.activity.address}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <HiCalendar className="h-4 w-4" />
                    <span>{formatDateTime(activityDetails.activity.dateTime).date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HiClock className="h-4 w-4" />
                    <span>{formatDateTime(activityDetails.activity.dateTime).time}</span>
                  </div>
                </div>
                <div
                  className="prose prose-sm max-w-none text-sm text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: activityDetails.activity.description,
                  }}
                />
              </div>

              {/* Botones de confirmación en el popup */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-200">
                <ActivityResponseButtons activityId={selectedActivityId} />
              </div>

              {/* Listas de respuestas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Confirmados */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiCheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">
                      Confirmados ({activityDetails.responses.confirmed.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.confirmed.length === 0 ? (
                      <p className="text-xs text-green-700 italic">Ninguno</p>
                    ) : (
                      activityDetails.responses.confirmed.map((response) => (
                        <div
                          key={response._id}
                          className="text-sm text-green-800 bg-white rounded-lg p-2"
                        >
                          {response.user?.name || response.user?.email || "Usuario"}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pendientes */}
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiPending className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-900">
                      Por Confirmar ({activityDetails.responses.pending.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.pending.length === 0 ? (
                      <p className="text-xs text-yellow-700 italic">Ninguno</p>
                    ) : (
                      activityDetails.responses.pending.map((response, idx) => (
                        <div
                          key={response._id || `pending-${idx}`}
                          className="text-sm text-yellow-800 bg-white rounded-lg p-2"
                        >
                          {response.user?.name || response.user?.email || "Usuario"}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Denegados */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiXCircle className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">
                      Denegados ({activityDetails.responses.denied.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.denied.length === 0 ? (
                      <p className="text-xs text-red-700 italic">Ninguno</p>
                    ) : (
                      activityDetails.responses.denied.map((response) => (
                        <div
                          key={response._id}
                          className="text-sm text-red-800 bg-white rounded-lg p-2"
                        >
                          {response.user?.name || response.user?.email || "Usuario"}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // Este return nunca debería ejecutarse, pero lo dejamos por seguridad
  return null;
}
