import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  HiUsers,
  HiLocationMarker,
  HiCalendar,
  HiClock,
  HiUser,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import Modal from "../components/Modal";
import type { Id } from "../../convex/_generated/dataModel";

const HiPending = HiClock;

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Grupo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Únete a un grupo de conexión usando un código de invitación
          </p>
        </div>

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Grupo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Información del grupo al que perteneces
          </p>
        </div>

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividades ({activities?.length || 0})
          </h3>
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Aún no hay actividades en este grupo
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const dateTime = formatDateTime(activity.dateTime);

                return (
                  <div
                    key={activity._id}
                    className="p-4 rounded-xl border-2 border-gray-200 transition-all cursor-pointer hover:border-blue-300 hover:shadow-md"
                    onClick={() => setSelectedActivityId(activity._id)}
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
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActivityResponseButtons activityId={activity._id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
