import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  HiLocationMarker,
  HiCalendar,
  HiClock,
  HiUsers,
  HiArrowLeft,
  HiPlus,
  HiCheckCircle,
  HiXCircle,
  HiClock as HiPending,
  HiAcademicCap,
  HiExclamationCircle,
  HiPencil,
  HiViewList,
  HiViewGrid,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
import RichTextEditor from "../components/RichTextEditor";
import type { Id } from "../../convex/_generated/dataModel";

// Lista de distritos de Lima
const LIMA_DISTRICTS = [
  "Ancón",
  "Ate",
  "Barranco",
  "Breña",
  "Carabayllo",
  "Chaclacayo",
  "Chorrillos",
  "Cieneguilla",
  "Comas",
  "El Agustino",
  "Independencia",
  "Jesús María",
  "La Molina",
  "La Victoria",
  "Lima",
  "Lince",
  "Los Olivos",
  "Lurigancho",
  "Lurín",
  "Magdalena del Mar",
  "Miraflores",
  "Pachacámac",
  "Pucusana",
  "Pueblo Libre",
  "Puente Piedra",
  "Punta Hermosa",
  "Punta Negra",
  "Rímac",
  "San Bartolo",
  "San Borja",
  "San Isidro",
  "San Juan de Lurigancho",
  "San Juan de Miraflores",
  "San Luis",
  "San Martín de Porres",
  "San Miguel",
  "Santa Anita",
  "Santa María del Mar",
  "Santa Rosa",
  "Santiago de Surco",
  "Surquillo",
  "Villa El Salvador",
  "Villa María del Triunfo",
];

const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

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

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const group = useQuery(
    api.groups.getGroupById,
    groupId ? { groupId: groupId as Id<"groups"> } : "skip"
  );
  const activities = useQuery(
    api.activities.getActivitiesByGroup,
    groupId ? { groupId: groupId as Id<"groups"> } : "skip"
  );
  const createActivity = useMutation(api.activities.createActivity);
  const updateGroup = useMutation(api.groups.updateGroup);
  const currentUser = useQuery(api.users.getMyProfile);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<Id<"activities"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [activitiesView, setActivitiesView] = useState<"list" | "calendar">("list");

  // Estados para el formulario de actividad
  const [activityName, setActivityName] = useState("");
  const [activityAddress, setActivityAddress] = useState("");
  const [activityDateTime, setActivityDateTime] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  // Estados para el formulario de edición de grupo
  const [groupName, setGroupName] = useState("");
  const [groupAddress, setGroupAddress] = useState("");
  const [groupDistrict, setGroupDistrict] = useState("");
  const [groupMinAge, setGroupMinAge] = useState("");
  const [groupMaxAge, setGroupMaxAge] = useState("");
  const [groupDay, setGroupDay] = useState("");
  const [groupTime, setGroupTime] = useState("");

  // Obtener detalles de actividad seleccionada (solo para líderes)
  const activityDetails = useQuery(
    api.activities.getActivityWithResponses,
    selectedActivityId ? { activityId: selectedActivityId } : "skip"
  );

  if (!groupId) {
    return <div>Grupo no encontrado</div>;
  }

  if (group === undefined || activities === undefined || currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Verificar si el usuario actual es líder del grupo
  const isLeader = group.leaders.some((leader) => leader?._id === currentUser._id);

  // Inicializar formulario de edición cuando se abre el modal
  const handleOpenEditModal = () => {
    setGroupName(group.name);
    setGroupAddress(group.address);
    setGroupDistrict(group.district);
    setGroupMinAge(group.minAge?.toString() || "");
    setGroupMaxAge(group.maxAge?.toString() || "");
    setGroupDay(group.day);
    setGroupTime(group.time);
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setErrors({});
    setGroupName("");
    setGroupAddress("");
    setGroupDistrict("");
    setGroupMinAge("");
    setGroupMaxAge("");
    setGroupDay("");
    setGroupTime("");
  };

  const handleUpdateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingGroup(true);
    setErrors({});

    // Validaciones
    if (!groupName || groupName.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsUpdatingGroup(false);
      return;
    }

    if (!groupAddress || groupAddress.trim().length < 5) {
      setErrors({ address: "Ingresa una dirección válida" });
      setIsUpdatingGroup(false);
      return;
    }

    if (!groupDistrict) {
      setErrors({ district: "Selecciona un distrito" });
      setIsUpdatingGroup(false);
      return;
    }

    if (!groupDay) {
      setErrors({ day: "Selecciona un día" });
      setIsUpdatingGroup(false);
      return;
    }

    if (!groupTime) {
      setErrors({ time: "Ingresa una hora válida" });
      setIsUpdatingGroup(false);
      return;
    }

    // Validar rango de edad
    const minAgeNum = groupMinAge ? parseInt(groupMinAge) : undefined;
    const maxAgeNum = groupMaxAge ? parseInt(groupMaxAge) : undefined;

    if (minAgeNum !== undefined && maxAgeNum !== undefined) {
      if (minAgeNum > maxAgeNum) {
        setErrors({ age: "La edad mínima no puede ser mayor que la máxima" });
        setIsUpdatingGroup(false);
        return;
      }
    }

    try {
      await updateGroup({
        groupId: groupId as Id<"groups">,
        name: groupName.trim(),
        address: groupAddress.trim(),
        district: groupDistrict,
        minAge: minAgeNum,
        maxAge: maxAgeNum,
        day: groupDay,
        time: groupTime,
      });

      setIsEditModalOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el grupo";
      setErrors({ submit: errorMessage });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!activityName || activityName.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (!activityAddress || activityAddress.trim().length < 5) {
      setErrors({ address: "Ingresa una dirección válida" });
      setIsSubmitting(false);
      return;
    }

    if (!activityDateTime) {
      setErrors({ dateTime: "Selecciona una fecha y hora" });
      setIsSubmitting(false);
      return;
    }

    const dateTime = new Date(activityDateTime).getTime();
    if (dateTime < Date.now()) {
      setErrors({ dateTime: "La fecha y hora deben ser futuras" });
      setIsSubmitting(false);
      return;
    }

    if (!activityDescription || activityDescription.trim().length < 10) {
      setErrors({ description: "La descripción debe tener al menos 10 caracteres" });
      setIsSubmitting(false);
      return;
    }

    try {
      await createActivity({
        groupId: groupId as Id<"groups">,
        name: activityName.trim(),
        address: activityAddress.trim(),
        dateTime,
        description: activityDescription,
      });

      // Reset form
      setActivityName("");
      setActivityAddress("");
      setActivityDateTime("");
      setActivityDescription("");
      setIsCreateModalOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear la actividad";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };


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

  return (
    <div className="space-y-6">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/groups")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          <p className="mt-1 text-sm text-gray-600">Detalle del grupo</p>
        </div>
      </div>

      {/* Banner con info del grupo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{group.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <HiLocationMarker className="h-4 w-4" />
              <span>{group.address}</span>
            </div>
            <p className="text-sm text-gray-600">{group.district}</p>
          </div>
          {isLeader && (
            <button
              onClick={handleOpenEditModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
              title="Editar información del grupo"
            >
              <HiPencil className="h-4 w-4" />
              Editar
            </button>
          )}
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {group.minAge && group.maxAge && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HiUsers className="h-5 w-5 text-blue-600" />
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
              <p className="text-sm font-semibold text-gray-900">{group.day}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HiClock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Hora</p>
              <p className="text-sm font-semibold text-gray-900">{group.time}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de discípulos */}
      <DisciplesSection disciples={group.disciples} />

      {/* Lista de líderes (discípulos que tienen su propio grupo) */}
      <LeadersSection disciples={group.disciples} />

      {/* Actividades */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Actividades ({activities.length})
          </h3>
          <div className="flex items-center gap-3">
            {/* Toggle de vista */}
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
            {isLeader && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <HiPlus className="h-5 w-5" />
                Nueva Actividad
              </button>
            )}
          </div>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aún no hay actividades en este grupo</p>
        ) : activitiesView === "list" ? (
          <div className="space-y-3">
            {activities.map((activity) => {
              const dateTime = formatDateTime(activity.dateTime);

              return (
                <div
                  key={activity._id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isLeader
                      ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                      : "border-gray-200"
                  }`}
                  onClick={() => {
                    setSelectedActivityId(activity._id);
                  }}
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
            isLeader={isLeader}
            onActivityClick={(activityId) => setSelectedActivityId(activityId)}
            ActivityResponseButtons={ActivityResponseButtons}
          />
        )}
      </div>

      {/* Modal para crear actividad */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setErrors({});
          setActivityName("");
          setActivityAddress("");
          setActivityDateTime("");
          setActivityDescription("");
        }}
        title="Crear Nueva Actividad"
      >
        <form onSubmit={handleCreateActivity} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Actividad
            </label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              placeholder="Ej: Reunión de oración"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={activityAddress}
              onChange={(e) => setActivityAddress(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.address
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              placeholder="Ej: Av. Principal 123"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora
            </label>
            <input
              type="datetime-local"
              value={activityDateTime}
              onChange={(e) => setActivityDateTime(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.dateTime
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
            />
            {errors.dateTime && (
              <p className="mt-1 text-sm text-red-500">{errors.dateTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <RichTextEditor
              content={activityDescription}
              onChange={setActivityDescription}
              placeholder="Describe la actividad..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setErrors({});
                setActivityName("");
                setActivityAddress("");
                setActivityDateTime("");
                setActivityDescription("");
              }}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? "Creando..." : "Crear Actividad"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para editar grupo */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Editar Información del Grupo"
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateGroup} className="space-y-5">
          {/* Nombre del grupo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Grupo *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              placeholder="Ej: Grupo de Conexión Norte"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección *
            </label>
            <input
              type="text"
              value={groupAddress}
              onChange={(e) => setGroupAddress(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.address
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
              placeholder="Ej: Av. Principal 123"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          {/* Distrito */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distrito *
            </label>
            <select
              value={groupDistrict}
              onChange={(e) => setGroupDistrict(e.target.value)}
              className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.district
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
            >
              <option value="">Selecciona un distrito</option>
              {LIMA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {errors.district && (
              <p className="mt-1 text-sm text-red-500">{errors.district}</p>
            )}
          </div>

          {/* Rango de edad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edad Mínima (opcional)
              </label>
              <input
                type="number"
                value={groupMinAge}
                onChange={(e) => setGroupMinAge(e.target.value)}
                min="0"
                className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.age
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Ej: 18"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edad Máxima (opcional)
              </label>
              <input
                type="number"
                value={groupMaxAge}
                onChange={(e) => setGroupMaxAge(e.target.value)}
                min="0"
                className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.age
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Ej: 35"
              />
            </div>
          </div>
          {errors.age && (
            <p className="text-sm text-red-500">{errors.age}</p>
          )}

          {/* Día y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día de Reunión *
              </label>
              <select
                value={groupDay}
                onChange={(e) => setGroupDay(e.target.value)}
                className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.day
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
              >
                <option value="">Selecciona un día</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              {errors.day && (
                <p className="mt-1 text-sm text-red-500">{errors.day}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora *
              </label>
              <input
                type="time"
                value={groupTime}
                onChange={(e) => setGroupTime(e.target.value)}
                className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.time
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
              />
              {errors.time && (
                <p className="mt-1 text-sm text-red-500">{errors.time}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdatingGroup}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isUpdatingGroup ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para detalles de actividad (solo líderes) */}
      {isLeader && activityDetails && selectedActivityId && (
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

// Componente para la sección de discípulos
function DisciplesSection({ disciples }: { disciples: Array<any> }) {
  const [selectedDiscipleId, setSelectedDiscipleId] = useState<Id<"users"> | null>(null);
  const selectedDisciple = disciples.find((d) => d?._id === selectedDiscipleId);
  const discipleCourses = useQuery(
    api.courses.getUserCoursesProgress,
    selectedDiscipleId ? { userId: selectedDiscipleId } : "skip"
  );

  const disciplesWithProgress = disciples
    .filter((disciple): disciple is NonNullable<typeof disciple> => disciple !== null);

  const hasDiscípulos = disciplesWithProgress.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Discípulos ({disciplesWithProgress.length})
      </h3>
      {!hasDiscípulos ? (
        <p className="text-sm text-gray-500 italic">Aún no hay discípulos en este grupo</p>
      ) : (
        <>
          {/* Tabla para desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nombre</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Escuela</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Cursos</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Área de Servicio</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {disciplesWithProgress.map((disciple) => (
                  <DiscipleRow
                    key={disciple._id}
                    disciple={disciple}
                    onClick={() => setSelectedDiscipleId(disciple._id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards para mobile */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {disciplesWithProgress.map((disciple) => (
              <DiscipleCard
                key={disciple._id}
                disciple={disciple}
                onClick={() => setSelectedDiscipleId(disciple._id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal de detalles del discípulo */}
      {selectedDisciple && (
        <DiscipleDetailsModal
          disciple={selectedDisciple}
          courses={discipleCourses}
          isOpen={!!selectedDiscipleId}
          onClose={() => setSelectedDiscipleId(null)}
        />
      )}
    </div>
  );
}

// Componente de fila de tabla para desktop
function DiscipleRow({
  disciple,
  onClick,
}: {
  disciple: any;
  onClick: () => void;
}) {
  const courses = useQuery(api.courses.getUserCoursesProgress, { userId: disciple._id });
  
  const courseCount = courses?.length || 0;
  const isActiveInSchool = disciple.isActiveInSchool || false;
  
  // Determinar si está atrasado (si tiene algún curso con backlog)
  const hasBacklog = courses?.some((course: any) => course.hasBacklog) || false;
  
  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        hasBacklog ? "bg-red-50/50" : ""
      }`}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm">
            {(disciple.name || disciple.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {disciple.name || "Sin nombre"}
            </p>
            {disciple.email && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{disciple.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        {isActiveInSchool ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <HiAcademicCap className="h-3 w-3" />
            Activo
          </span>
        ) : (
          <span className="text-xs text-gray-500">Inactivo</span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm font-medium text-gray-900">{courseCount}</span>
      </td>
      <td className="py-3 px-4 text-center">
        {disciple.service ? (
          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            {disciple.service.name}
          </span>
        ) : (
          <span className="text-xs text-gray-500">Sin servicio</span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {hasBacklog ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <HiExclamationCircle className="h-3 w-3" />
            Atrasado
          </span>
        ) : courseCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <HiCheckCircle className="h-3 w-3" />
            Al día
          </span>
        ) : (
          <span className="text-xs text-gray-500">Sin cursos</span>
        )}
      </td>
    </tr>
  );
}

// Componente de card para mobile
function DiscipleCard({
  disciple,
  onClick,
}: {
  disciple: any;
  onClick: () => void;
}) {
  const courses = useQuery(api.courses.getUserCoursesProgress, { userId: disciple._id });
  
  const courseCount = courses?.length || 0;
  const isActiveInSchool = disciple.isActiveInSchool || false;
  const hasBacklog = courses?.some((course: any) => course.hasBacklog) || false;

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
        hasBacklog
          ? "bg-red-50/50 border-red-200 hover:border-red-300"
          : "bg-gray-50 border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
        {(disciple.name || disciple.email || "U")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900">
            {disciple.name || "Sin nombre"}
          </p>
          {hasBacklog && (
            <HiExclamationCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
        </div>
        {disciple.email && (
          <p className="text-xs text-gray-600 truncate mb-2">{disciple.email}</p>
        )}
        <div className="flex items-center gap-3 text-xs">
          {isActiveInSchool ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              <HiAcademicCap className="h-3 w-3" />
              Escuela
            </span>
          ) : (
            <span className="text-gray-500">Sin escuela</span>
          )}
          <span className="text-gray-600">
            {courseCount} curso{courseCount !== 1 ? "s" : ""}
          </span>
          {disciple.service ? (
            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              {disciple.service.name}
            </span>
          ) : (
            <span className="text-gray-500">Sin servicio</span>
          )}
          {hasBacklog ? (
            <span className="text-red-600 font-medium">Atrasado</span>
          ) : courseCount > 0 ? (
            <span className="text-green-600 font-medium">Al día</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Modal de detalles del discípulo
function DiscipleDetailsModal({
  disciple,
  courses,
  isOpen,
  onClose,
}: {
  disciple: any;
  courses: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (courses === undefined) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Detalles - ${disciple.name || "Discípulo"}`} maxWidth="2xl">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles - ${disciple.name || "Discípulo"}`}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Información básica */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
              {(disciple.name || disciple.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {disciple.name || "Sin nombre"}
              </p>
              {disciple.email && (
                <p className="text-sm text-gray-600">{disciple.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-2">
              {disciple.isActiveInSchool ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <HiAcademicCap className="h-4 w-4" />
                  Activo en Escuela
                </span>
              ) : (
                <span className="text-sm text-gray-500">Inactivo en Escuela</span>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {courses?.length || 0} curso{(courses?.length || 0) !== 1 ? "s" : ""} inscrito{(courses?.length || 0) !== 1 ? "s" : ""}
            </span>
            {disciple.service ? (
              <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {disciple.service.name}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Sin área de servicio</span>
            )}
          </div>
        </div>

        {/* Lista de cursos */}
        {!courses || courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HiUsers className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No está inscrito en ningún curso</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Cursos y Progreso
            </h4>
            {courses.map((course: any) => (
              <div
                key={course._id}
                className={`p-4 rounded-xl border-2 ${
                  course.hasBacklog
                    ? "bg-red-50/50 border-red-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-semibold text-gray-900">{course.name}</h5>
                    {course.description && (
                      <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                    )}
                  </div>
                  {course.hasBacklog ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <HiExclamationCircle className="h-3 w-3" />
                      Atrasado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <HiCheckCircle className="h-3 w-3" />
                      Al día
                    </span>
                  )}
                </div>

                {/* Progreso semanal */}
                {course.weekStatuses && course.weekStatuses.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Progreso Semanal (Semana {course.currentWeek} de {course.durationWeeks || 9})
                    </p>
                    <div className="grid grid-cols-9 gap-1">
                      {course.weekStatuses.map((weekStatus: any) => (
                        <div
                          key={weekStatus.week}
                          className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                            weekStatus.status === "al-dia"
                              ? "bg-green-100 text-green-700"
                              : weekStatus.status === "atrasado"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                          title={`Semana ${weekStatus.week}: ${weekStatus.status}`}
                        >
                          {weekStatus.isCompleted ? (
                            <HiCheckCircle className="h-4 w-4" />
                          ) : (
                            weekStatus.week
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded"></div>
                        <span>Al día</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 rounded"></div>
                        <span>Atrasado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-100 rounded"></div>
                        <span>Pendiente</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trabajo y examen */}
                {course.completedWorkAndExam !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      {course.completedWorkAndExam ? (
                        <>
                          <HiCheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-700">Trabajo y examen completados</span>
                        </>
                      ) : (
                        <>
                          <HiXCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Trabajo y examen pendientes</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Componente para la sección de líderes (discípulos que tienen su propio grupo)
function LeadersSection({ disciples }: { disciples: Array<{ _id: Id<"users">; name?: string; email?: string } | null> }) {
  const [selectedLeader, setSelectedLeader] = useState<{
    user: { _id: Id<"users">; name?: string; email?: string };
    groups: Array<{
      _id: Id<"groups">;
      name: string;
      address: string;
      district: string;
      minAge?: number;
      maxAge?: number;
      day: string;
      time: string;
      leaders: Array<{ _id: Id<"users">; name?: string; email?: string } | null>;
      disciples: Array<{ _id: Id<"users">; name?: string; email?: string } | null>;
    }>;
  } | null>(null);

  const disciplesWithProgress = disciples
    .filter((disciple): disciple is NonNullable<typeof disciple> => disciple !== null);

  const discipleIds = disciplesWithProgress.map((d) => d._id);
  
  // Si no hay discípulos, retornar array vacío directamente sin hacer query
  const disciplesWhoAreLeaders = useQuery(
    api.groups.getDisciplesWhoAreLeaders,
    { discipleIds } // Siempre pasar el array, incluso si está vacío (la query maneja arrays vacíos)
  );

  // Si está undefined, mostrar loading solo si hay discípulos para verificar
  if (disciplesWhoAreLeaders === undefined && discipleIds.length > 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Líderes
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Si no hay discípulos o la query retornó vacío, usar array vacío
  const leadersList = disciplesWhoAreLeaders || [];

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Líderes {leadersList.length > 0 && `(${leadersList.length})`}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Discípulos que han abierto su propio grupo
        </p>

        {leadersList.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <HiUsers className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 italic">
              Aún no tienes líderes en tu grupo
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Los discípulos que abran su propio grupo aparecerán aquí
            </p>
          </div>
        ) : (
          <>
            {/* Tabla para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Grupos</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Información</th>
                  </tr>
                </thead>
                <tbody>
                  {leadersList.map((item) => (
                    <LeaderRow
                      key={item.user._id}
                      item={item}
                      onClick={() => setSelectedLeader(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards para mobile */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {leadersList.map((item) => (
                <LeaderCard
                  key={item.user._id}
                  item={item}
                  onClick={() => setSelectedLeader(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalles del líder */}
      {selectedLeader && (
        <LeaderDetailsModal
          leader={selectedLeader}
          isOpen={!!selectedLeader}
          onClose={() => setSelectedLeader(null)}
        />
      )}
    </>
  );
}

// Componente de fila de tabla para desktop
function LeaderRow({
  item,
  onClick,
}: {
  item: {
    user: { _id: Id<"users">; name?: string; email?: string };
    groups: Array<{ _id: Id<"groups">; name: string; disciples: Array<unknown> }>;
  };
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {(item.user.name || item.user.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {item.user.name || "Sin nombre"}
            </p>
            {item.user.email && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.user.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm font-medium text-gray-900">{item.groups.length}</span>
      </td>
      <td className="py-3 px-4">
        <div className="space-y-1">
          {item.groups.map((group) => (
            <div key={group._id} className="text-xs text-gray-600">
              <span className="font-medium">{group.name}</span>
              <span className="text-gray-400 mx-1">•</span>
              <span>{group.disciples.length} discípulo{group.disciples.length !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// Componente de card para mobile
function LeaderCard({
  item,
  onClick,
}: {
  item: {
    user: { _id: Id<"users">; name?: string; email?: string };
    groups: Array<{ _id: Id<"groups">; name: string; disciples: Array<unknown> }>;
  };
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer transition-all"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
        {(item.user.name || item.user.email || "U")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {item.user.name || "Sin nombre"}
        </p>
        {item.user.email && (
          <p className="text-xs text-gray-600 truncate mb-2">{item.user.email}</p>
        )}
        <div className="space-y-1">
          {item.groups.map((group) => (
            <div key={group._id} className="text-xs text-gray-600">
              <span className="font-medium">{group.name}</span>
              <span className="text-gray-400 mx-1">•</span>
              <span>{group.disciples.length} discípulo{group.disciples.length !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modal de detalles del líder
function LeaderDetailsModal({
  leader,
  isOpen,
  onClose,
}: {
  leader: {
    user: { _id: Id<"users">; name?: string; email?: string };
    groups: Array<{
      _id: Id<"groups">;
      name: string;
      address: string;
      district: string;
      minAge?: number;
      maxAge?: number;
      day: string;
      time: string;
      leaders: Array<{ _id: Id<"users">; name?: string; email?: string } | null>;
      disciples: Array<{ _id: Id<"users">; name?: string; email?: string } | null>;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Grupos de ${leader.user.name || leader.user.email || "Líder"}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Información del líder */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {(leader.user.name || leader.user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {leader.user.name || "Sin nombre"}
              </p>
              {leader.user.email && (
                <p className="text-sm text-gray-600">{leader.user.email}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Líder de {leader.groups.length} grupo{leader.groups.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Lista de grupos */}
        {leader.groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HiUsers className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No tiene grupos asignados</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leader.groups.map((group) => (
              <div
                key={group._id}
                className="bg-gray-50 rounded-xl border border-gray-200 p-5"
              >
                {/* Información del grupo */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {group.name}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <HiLocationMarker className="h-4 w-4" />
                      <span>{group.address}</span>
                    </div>
                    <p className="ml-6">{group.district}</p>
                    {(group.minAge || group.maxAge) && (
                      <p className="ml-6">
                        <span className="font-medium">Edad:</span>{" "}
                        {group.minAge && group.maxAge
                          ? `${group.minAge} - ${group.maxAge} años`
                          : group.minAge
                          ? `Desde ${group.minAge} años`
                          : `Hasta ${group.maxAge} años`}
                      </p>
                    )}
                    <div className="flex items-center gap-4 ml-6">
                      <div className="flex items-center gap-1">
                        <HiCalendar className="h-4 w-4" />
                        <span>{group.day}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HiClock className="h-4 w-4" />
                        <span>{group.time}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Líderes del grupo */}
                {group.leaders.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Líderes ({group.leaders.filter(Boolean).length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.leaders
                        .filter((l): l is NonNullable<typeof l> => l !== null)
                        .map((leader) => (
                          <span
                            key={leader._id}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {leader.name || leader.email || "Sin nombre"}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Discípulos del grupo */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">
                    Discípulos ({group.disciples.filter(Boolean).length})
                  </p>
                  {group.disciples.filter(Boolean).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Aún no hay discípulos en este grupo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.disciples
                        .filter((d): d is NonNullable<typeof d> => d !== null)
                        .map((disciple) => (
                          <div
                            key={disciple._id}
                            className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm">
                              {(disciple.name || disciple.email || "U")[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {disciple.name || "Sin nombre"}
                              </p>
                              {disciple.email && (
                                <p className="text-xs text-gray-500 truncate">
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
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

