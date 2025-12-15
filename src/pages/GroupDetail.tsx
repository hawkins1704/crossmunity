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
} from "react-icons/hi";
import Modal from "../components/Modal";
import RichTextEditor from "../components/RichTextEditor";
import type { Id } from "../../convex/_generated/dataModel";

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
    <div className="flex flex-col items-end gap-2 ml-4">
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRespond("confirmed");
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
            myResponse?.status === "confirmed"
              ? "bg-green-100 text-green-700 border-2 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 border-2 border-transparent"
          }`}
          title="Confirmar asistencia"
        >
          <HiCheckCircle className="h-4 w-4" />
          <span>Confirmar</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRespond("denied");
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
            myResponse?.status === "denied"
              ? "bg-red-100 text-red-700 border-2 border-red-300"
              : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 border-2 border-transparent"
          }`}
          title="No asistiré"
        >
          <HiXCircle className="h-4 w-4" />
          <span>No asistiré</span>
        </button>
      </div>
      {myResponse?.status && (
        <span className="text-xs text-gray-500">
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
  const currentUser = useQuery(api.users.getMyProfile);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<Id<"activities"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para el formulario de actividad
  const [activityName, setActivityName] = useState("");
  const [activityAddress, setActivityAddress] = useState("");
  const [activityDateTime, setActivityDateTime] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Discípulos ({group.disciples.length})
        </h3>
        {group.disciples.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aún no hay discípulos en este grupo</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.disciples
              .filter((disciple): disciple is NonNullable<typeof disciple> => disciple !== null)
              .map((disciple) => (
                <div
                  key={disciple._id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
                    {(disciple.name || disciple.email || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {disciple.name || "Sin nombre"}
                    </p>
                    {disciple.email && (
                      <p className="text-xs text-gray-600 truncate">{disciple.email}</p>
                    )}
                    {disciple.courses && disciple.courses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {disciple.courses.map((course) => (
                          <span
                            key={course._id}
                            className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                          >
                            {course.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Actividades */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Actividades ({activities.length})
          </h3>
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

        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aún no hay actividades en este grupo</p>
        ) : (
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        {activity.name}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <HiLocationMarker className="h-4 w-4" />
                        <span>{activity.address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <HiCalendar className="h-4 w-4" />
                          <span>{dateTime.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HiClock className="h-4 w-4" />
                          <span>{dateTime.time}</span>
                        </div>
                      </div>
                    </div>
                    <ActivityResponseButtons activityId={activity._id} />
                  </div>
                </div>
              );
            })}
          </div>
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

