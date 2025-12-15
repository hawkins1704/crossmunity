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
  HiClipboardCopy,
  HiCheck,
} from "react-icons/hi";

export default function MyGroup() {
  const group = useQuery(api.groups.getGroupAsDisciple);
  const joinGroup = useMutation(api.groups.joinGroup);

  const [invitationCode, setInvitationCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const copyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (group === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
      </div>
    );
  }

  // Si el usuario NO pertenece a ningún grupo
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
