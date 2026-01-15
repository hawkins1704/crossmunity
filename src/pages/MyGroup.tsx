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
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
import type { Id } from "../../convex/_generated/dataModel";
import { IoIosCalendar } from "react-icons/io";

const HiPending = HiClock;

// Componente para la vista de calendario de actividades (tipo Google Calendar)
function ActivitiesCalendarView({
  activities,
  onActivityClick,
}: {
  activities: Array<{
    _id: Id<"activities">;
    name: string;
    address: string;
    dateTime: number;
  }>;
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
            className="p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
            title="Mes anterior"
          >
            <HiChevronLeft className="h-5 w-5 text-black" />
          </button>
          <h3 className="text-xl font-normal text-black capitalize">
            {monthName}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
            title="Mes siguiente"
          >
            <HiChevronRight className="h-5 w-5 text-black" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-normal text-black hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
        >
          Hoy
        </button>
      </div>

      {/* Calendario */}
      <div className="bg-white border border-[#e5e5e5] overflow-hidden">
        {/* Encabezados de días de la semana */}
        <div className="grid grid-cols-7 border-b border-[#e5e5e5]">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-normal text-[#666666] uppercase bg-[#fafafa]"
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
                className={`min-h-[120px] border-b border-[#e5e5e5] p-2 bg-[#fafafa] ${
                  !isLastColumn ? "border-r border-[#e5e5e5]" : ""
                }`}
              >
                <div className="text-xs font-normal text-[#999999] mb-1">{day}</div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, 4).map((activity) => (
                    <div
                      key={activity._id}
                      className="text-xs px-1.5 py-0.5 bg-white text-black border border-[#e5e5e5] truncate cursor-pointer hover:border-black transition-colors"
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-normal">{getTime(activity.dateTime)}</span> {activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 4 && (
                    <div className="text-xs font-normal text-[#666666] px-1.5">
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
                className={`min-h-[120px] border-b border-[#e5e5e5] p-2 hover:bg-[#fafafa] transition-colors ${
                  today ? "bg-[#fafafa]" : ""
                } ${!isLastColumn ? "border-r border-[#e5e5e5]" : ""}`}
              >
                <div
                  className={`text-sm font-normal mb-1 inline-flex items-center justify-center ${
                    today
                      ? "w-7 h-7 bg-black text-white"
                      : "text-black"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, 4).map((activity) => (
                    <div
                      key={activity._id}
                      className="text-xs px-1.5 py-0.5 bg-white text-black border border-[#e5e5e5] truncate cursor-pointer hover:border-black transition-colors"
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-normal">{getTime(activity.dateTime)}</span> {activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 4 && (
                    <div className="text-xs font-normal text-[#666666] px-1.5">
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
                className={`min-h-[120px] border-b border-[#e5e5e5] p-2 bg-[#fafafa] ${
                  !isLastColumn ? "border-r border-[#e5e5e5]" : ""
                }`}
              >
                <div className="text-xs font-normal text-[#999999] mb-1">{day}</div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, 4).map((activity) => (
                    <div
                      key={activity._id}
                      className="text-xs px-1.5 py-0.5 bg-white text-black border border-[#e5e5e5] truncate cursor-pointer hover:border-black transition-colors"
                      onClick={() => onActivityClick(activity._id)}
                      title={`${getTime(activity.dateTime)} - ${activity.name}`}
                    >
                      <span className="font-normal">{getTime(activity.dateTime)}</span> {activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 4 && (
                    <div className="text-xs font-normal text-[#666666] px-1.5">
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
          className={`flex items-center gap-2 px-3 py-2 transition-colors font-normal text-sm flex-1 md:flex-initial border ${
            myResponse?.status === "confirmed"
              ? "bg-green-50 text-black border-green-200"
              : "bg-white text-black border-[#e5e5e5] hover:border-green-200 hover:bg-green-50"
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
          className={`flex items-center gap-2 px-3 py-2 transition-colors font-normal text-sm flex-1 md:flex-initial border ${
            myResponse?.status === "denied"
              ? "bg-red-50 text-black border-red-200"
              : "bg-white text-black border-[#e5e5e5] hover:border-red-200 hover:bg-red-50"
          }`}
          title="No asistiré"
        >
          <HiXCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">No asistiré</span>
        </button>
      </div>
      {myResponse?.status && (
        <span className="text-xs font-normal text-[#666666] md:text-right w-full md:w-auto">
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
  const [visibleDisciples, setVisibleDisciples] = useState(5);

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
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
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
        <div className="bg-white border border-[#e5e5e5] p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
              <HiUsers className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-normal text-black mb-3 tracking-tight">
              No perteneces a ningún grupo
            </h2>
            <p className="text-sm font-normal text-[#666666]">
              Pide el código de invitación a un líder de grupo para unirte
            </p>
          </div>

          {/* Formulario para unirse */}
          <form onSubmit={handleJoinGroup} className="space-y-6">
            <div>
              <label
                htmlFor="invitationCode"
                className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
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
                  className={`block w-full px-4 py-3 border bg-white font-mono text-lg text-center tracking-widest text-black focus:outline-none focus:border-black transition-colors ${
                    error
                      ? "border-[#d32f2f]"
                      : "border-[#e5e5e5]"
                  }`}
                  required
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#d32f2f]">
                  <HiXCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mt-2 flex items-center gap-2 text-xs text-black">
                  <HiCheckCircle className="h-4 w-4" />
                  <span>¡Te has unido al grupo exitosamente!</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isJoining || invitationCode.length !== 6}
              className="w-full px-4 py-3 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isJoining ? "Uniéndose..." : "Unirse al Grupo"}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-[#fafafa] border border-[#e5e5e5]">
            <p className="text-sm font-normal text-black">
              <strong>¿Cómo obtener un código?</strong>
            </p>
            <p className="text-sm font-normal text-[#666666] mt-1">
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
        <div className="bg-white border border-[#e5e5e5] p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-normal text-black mb-2 tracking-tight">
                {group.name}
              </h2>
              <div className="flex items-center gap-2 text-sm font-normal text-[#666666]">
                <HiLocationMarker className="h-4 w-4" />
                <span>{group.address}</span>
              </div>
              <p className="text-sm font-normal text-[#666666] mt-1">{group.district}</p>
            </div>
            <div className="px-3 py-1 bg-green-50 text-black border border-green-200 text-sm font-normal flex items-center gap-1">
              <HiCheckCircle className="h-4 w-4" />
              Activo
            </div>
          </div>

          {/* Información del grupo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {group.minAge && group.maxAge && (
              <div className="flex items-center gap-3 p-3 bg-[#fafafa] border border-[#e5e5e5]">
                <div className="p-2">
                  <HiUser className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Rango de Edad</p>
                  <p className="text-sm font-normal text-black">
                    {group.minAge} - {group.maxAge} años
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-[#fafafa] border border-[#e5e5e5]">
              <div className="p-2">
                <HiCalendar className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Día de Reunión</p>
                <p className="text-sm font-normal text-black">
                  {group.day}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#fafafa] border border-[#e5e5e5]">
              <div className="p-2">
                <HiClock className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Hora</p>
                <p className="text-sm font-normal text-black">
                  {group.time}
                </p>
              </div>
            </div>
          </div>

          {/* Líderes */}
          <div className="mb-6">
            <h3 className="text-xs font-normal text-black mb-3 uppercase tracking-wide">
              Mis líderes
            </h3>
            <div className="space-y-2">
              {group.leaders
                .filter((leader): leader is NonNullable<typeof leader> => leader !== null)
                .map((leader) => (
                  <div
                    key={leader._id}
                    className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5]"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center font-normal ${
                      leader.gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                    }`}>
                      {(leader.name || leader.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-normal text-black">
                        {leader.name || "Sin nombre"}
                      </p>
                      {leader.email && (
                        <p className="text-xs font-normal text-[#666666]">{leader.email}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-[#fafafa] text-black border border-[#e5e5e5] text-xs font-normal">
                      {leader.gender === "Male" ? "Hombre" : "Mujer"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Mis consiervos */}
          <div>
            <h3 className="text-xs font-normal text-black mb-3 uppercase tracking-wide">
              Mis consiervos ({group.disciples.length})
            </h3>
            {group.disciples.length === 0 ? (
              <p className="text-sm font-normal text-[#666666]">
                Aún no hay consiervos en tu grupo
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {group.disciples
                    .filter((disciple): disciple is NonNullable<typeof disciple> => disciple !== null)
                    .slice(0, visibleDisciples)
                    .map((disciple) => {
                      const isMale = disciple.gender === "Male";
                      return (
                        <div
                          key={disciple._id}
                          className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5]"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-normal ${
                            isMale ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                          }`}>
                            {(disciple.name || disciple.email || "U")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-normal text-black truncate">
                              {disciple.name || "Sin nombre"}
                            </p>
                            {disciple.email && (
                              <p className="text-xs font-normal text-[#666666] truncate">
                                {disciple.email}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                {group.disciples.filter((d): d is NonNullable<typeof d> => d !== null).length > visibleDisciples && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setVisibleDisciples(prev => prev + 5)}
                      className="px-6 py-2 text-sm font-normal text-black hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
                    >
                      Ver más
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actividades */}
        <div className="bg-white border border-[#e5e5e5] p-6 mt-6">
          <div className="flex flex-col gap-2 md:flex-row items-start md:items-center justify-between mb-4">
            <h3 className="text-lg font-normal text-black w-full md:w-auto">
              Actividades ({activities?.length || 0})
            </h3>
            {/* Toggle de vista */}
            {activities && activities.length > 0 && (
              <div className="flex items-center border border-[#e5e5e5] w-full md:w-auto">
                <button
                  onClick={() => setActivitiesView("list")}
                  className={`flex flex-1 justify-center items-center gap-2 px-3 py-2 transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                    activitiesView === "list"
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-[#fafafa]"
                  }`}
                  title="Vista de lista"
                >
                  <HiViewList className="h-4 w-4" />
                  <span className="text-sm font-normal">Lista</span>
                </button>
                <button
                  onClick={() => setActivitiesView("calendar")}
                  className={`flex flex-1 justify-center items-center gap-2 px-3 py-2 transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                    activitiesView === "calendar"
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-[#fafafa]"
                  }`}
                  title="Vista de calendario"
                >
                  <IoIosCalendar className="h-4 w-4" />
                  <span className="text-sm font-normal">Calendario</span>
                </button>
              </div>
            )}
          </div>
          {!activities || activities.length === 0 ? (
            <p className="text-sm font-normal text-[#666666]">
              Aún no hay actividades en este grupo
            </p>
          ) : activitiesView === "list" ? (
            <div className="space-y-3">
              {activities.map((activity) => {
                const dateTime = formatDateTime(activity.dateTime);

                return (
                  <div
                    key={activity._id}
                    className="p-4 border border-[#e5e5e5] transition-colors cursor-pointer hover:border-black"
                    onClick={() => setSelectedActivityId(activity._id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-normal text-black mb-1">
                          {activity.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm font-normal text-[#666666] mb-1">
                          <HiLocationMarker className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{activity.address}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-normal text-[#666666]">
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
            maxWidth="4xl"
          >
            <div className="space-y-6">
              {/* Información de la actividad */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-normal text-[#666666]">
                  <HiLocationMarker className="h-4 w-4" />
                  <span>{activityDetails.activity.address}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-normal text-[#666666]">
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
                  className="prose prose-sm max-w-none text-sm font-normal text-black"
                  dangerouslySetInnerHTML={{
                    __html: activityDetails.activity.description,
                  }}
                />
              </div>

              {/* Botones de confirmación en el popup */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#e5e5e5]">
                <ActivityResponseButtons activityId={selectedActivityId} />
              </div>

              {/* Listas de respuestas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Confirmados */}
                <div className="bg-green-50 p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiCheckCircle className="h-5 w-5 text-black" />
                    <h4 className="font-normal text-black text-sm">
                      Confirmados ({activityDetails.responses.confirmed.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.confirmed.length === 0 ? (
                      <p className="text-xs font-normal text-[#666666]">Ninguno</p>
                    ) : (
                      activityDetails.responses.confirmed.map((response) => (
                        <div
                          key={response._id}
                          className="text-sm font-normal text-black bg-white p-2 border border-green-200"
                        >
                          {response.user?.name || response.user?.email || "Usuario"}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pendientes */}
                <div className="bg-yellow-50 p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiPending className="h-5 w-5 text-black" />
                    <h4 className="font-normal text-black text-sm">
                      Por Confirmar ({activityDetails.responses.pending.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.pending.length === 0 ? (
                      <p className="text-xs font-normal text-[#666666]">Ninguno</p>
                    ) : (
                      activityDetails.responses.pending.map((response, idx) => (
                        <div
                          key={response._id || `pending-${idx}`}
                          className="text-sm font-normal text-black bg-white p-2 border border-yellow-200"
                        >
                          {response.user?.name || response.user?.email || "Usuario"}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Denegados */}
                <div className="bg-red-50 p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiXCircle className="h-5 w-5 text-black" />
                    <h4 className="font-normal text-black text-sm">
                      Denegados ({activityDetails.responses.denied.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activityDetails.responses.denied.length === 0 ? (
                      <p className="text-xs font-normal text-[#666666]">Ninguno</p>
                    ) : (
                      activityDetails.responses.denied.map((response) => (
                        <div
                          key={response._id}
                          className="text-sm font-normal text-black bg-white p-2 border border-red-200"
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
