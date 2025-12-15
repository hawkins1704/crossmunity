import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiPlus, HiUsers, HiLocationMarker, HiClipboardCopy, HiCheck, HiSearch, HiX } from "react-icons/hi";
import Modal from "../components/Modal";
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

export default function Groups() {
  const groups = useQuery(api.groups.getGroupsAsLeader);
  const createGroup = useMutation(api.groups.createGroup);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para el buscador de co-líder
  const [coLeaderSearch, setCoLeaderSearch] = useState("");
  const [coLeaderId, setCoLeaderId] = useState<Id<"users"> | null>(null);
  const [selectedCoLeader, setSelectedCoLeader] = useState<{
    _id: Id<"users">;
    name?: string;
    email?: string;
    role: "Pastor" | "Member";
    gender: "Male" | "Female";
  } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Buscar usuarios mientras se escribe
  const searchResults = useQuery(
    api.users.searchUsersByEmail,
    coLeaderSearch.length >= 2 ? { searchTerm: coLeaderSearch } : "skip"
  );

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCoLeader = (user: {
    _id: Id<"users">;
    name?: string;
    email?: string;
    role: "Pastor" | "Member";
    gender: "Male" | "Female";
  }) => {
    setSelectedCoLeader(user);
    setCoLeaderId(user._id);
    setCoLeaderSearch(user.email || "");
    setShowSearchResults(false);
    setErrors((prev) => ({ ...prev, coLeader: "" }));
  };

  const handleRemoveCoLeader = () => {
    setSelectedCoLeader(null);
    setCoLeaderId(null);
    setCoLeaderSearch("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const district = formData.get("district") as string;
    const minAge = formData.get("minAge") as string;
    const maxAge = formData.get("maxAge") as string;
    const day = formData.get("day") as string;
    const time = formData.get("time") as string;

    // Validaciones
    if (!name || name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (!address || address.trim().length < 5) {
      setErrors({ address: "Ingresa una dirección válida" });
      setIsSubmitting(false);
      return;
    }

    if (!district) {
      setErrors({ district: "Selecciona un distrito" });
      setIsSubmitting(false);
      return;
    }

    if (!day) {
      setErrors({ day: "Selecciona un día" });
      setIsSubmitting(false);
      return;
    }

    if (!time) {
      setErrors({ time: "Ingresa una hora válida" });
      setIsSubmitting(false);
      return;
    }

    // Validar rango de edad
    const minAgeNum = minAge ? parseInt(minAge) : undefined;
    const maxAgeNum = maxAge ? parseInt(maxAge) : undefined;
    
    if (minAgeNum !== undefined && maxAgeNum !== undefined) {
      if (minAgeNum > maxAgeNum) {
        setErrors({ age: "La edad mínima no puede ser mayor que la máxima" });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await createGroup({
        name: name.trim(),
        address: address.trim(),
        district,
        minAge: minAgeNum,
        maxAge: maxAgeNum,
        day,
        time,
        coLeaderId: coLeaderId || undefined,
      });
      
      // Reset form y estados
      if (formRef.current) {
        formRef.current.reset();
      }
      setCoLeaderSearch("");
      setCoLeaderId(null);
      setSelectedCoLeader(null);
      setShowSearchResults(false);
      setErrors({});
      setIsModalOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear el grupo";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleModalClose = () => {
    // Reset form si existe
    if (formRef.current) {
      formRef.current.reset();
    }
    setIsModalOpen(false);
    setErrors({});
    setCoLeaderSearch("");
    setCoLeaderId(null);
    setSelectedCoLeader(null);
    setShowSearchResults(false);
  };

  const handleModalOpen = () => {
    // Reset form y estados al abrir
    if (formRef.current) {
      formRef.current.reset();
    }
    setErrors({});
    setCoLeaderSearch("");
    setCoLeaderId(null);
    setSelectedCoLeader(null);
    setShowSearchResults(false);
    setIsModalOpen(true);
  };

  if (groups === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Grupos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Grupos donde eres líder
          </p>
        </div>
        <button
          onClick={handleModalOpen}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <HiPlus className="h-5 w-5" />
          Crear Grupo
        </button>
      </div>

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiUsers className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No has creado ningún grupo
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primer grupo de conexión para comenzar a liderar.
          </p>
          <button
            onClick={handleModalOpen}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <HiPlus className="h-5 w-5" />
            Crear tu primer grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div
              key={group._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <HiLocationMarker className="h-4 w-4" />
                    <span>{group.address}</span>
                  </div>
                  <p className="text-sm text-gray-600">{group.district}</p>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mb-4 space-y-2 text-sm">
                {group.minAge && group.maxAge && (
                  <p className="text-gray-600">
                    <span className="font-medium">Edad:</span> {group.minAge} - {group.maxAge} años
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium">Día:</span> {group.day}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Hora:</span> {group.time}
                </p>
              </div>

              {/* Código de invitación */}
              <div className="mb-4 p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Código de Invitación
                    </p>
                    <p className="text-lg font-mono font-bold text-gray-900">
                      {group.invitationCode}
                    </p>
                  </div>
                  <button
                    onClick={() => copyInvitationCode(group.invitationCode)}
                    className="p-2 rounded-full hover:bg-white/50 transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode === group.invitationCode ? (
                      <HiCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <HiClipboardCopy className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Líderes */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Líderes</p>
                <div className="flex flex-wrap gap-2">
                  {group.leaders
                    .filter((leader): leader is NonNullable<typeof leader> => leader !== null)
                    .map((leader) => (
                      <span
                        key={leader._id}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {leader.name || leader.email}
                      </span>
                    ))}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <HiUsers className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {group.disciples.length}
                    </span>{" "}
                    discípulo{group.disciples.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear grupo */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Crear Nuevo Grupo"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre del grupo */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Grupo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
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
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Dirección *
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
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
            <label
              htmlFor="district"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Distrito *
            </label>
            <select
              id="district"
              name="district"
              required
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
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
              <label
                htmlFor="minAge"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Edad Mínima
              </label>
              <input
                id="minAge"
                name="minAge"
                type="number"
                min="0"
                max="100"
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.age
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Ej: 18"
              />
            </div>
            <div>
              <label
                htmlFor="maxAge"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Edad Máxima
              </label>
              <input
                id="maxAge"
                name="maxAge"
                type="number"
                min="0"
                max="100"
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.age
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Ej: 35"
              />
            </div>
          </div>
          {errors.age && (
            <p className="text-sm text-red-500 -mt-3">{errors.age}</p>
          )}

          {/* Día */}
          <div>
            <label
              htmlFor="day"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Día de la Semana *
            </label>
            <select
              id="day"
              name="day"
              required
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
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

          {/* Hora */}
          <div>
            <label
              htmlFor="time"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Hora *
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
              className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.time
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
              }`}
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-500">{errors.time}</p>
            )}
          </div>

          {/* Co-líder (buscador) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Co-líder (Opcional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Busca un usuario por email para agregarlo como co-líder. Debe ser
              de diferente género al tuyo.
            </p>
            
            <div className="relative" ref={searchRef}>
              {selectedCoLeader ? (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCoLeader.name || "Sin nombre"}
                    </p>
                    <p className="text-xs text-gray-600">{selectedCoLeader.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoLeader}
                    className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    <HiX className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={coLeaderSearch}
                      onChange={(e) => {
                        setCoLeaderSearch(e.target.value);
                        setShowSearchResults(true);
                        setErrors((prev) => ({ ...prev, coLeader: "" }));
                      }}
                      onFocus={() => {
                        if (coLeaderSearch.length >= 2) {
                          setShowSearchResults(true);
                        }
                      }}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                        errors.coLeader
                          ? "border-red-300 focus:ring-red-200"
                          : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                      }`}
                      placeholder="Buscar por email..."
                    />
                  </div>

                  {/* Resultados de búsqueda */}
                  {showSearchResults && coLeaderSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {searchResults === undefined ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Buscando...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No se encontraron usuarios con ese correo
                        </div>
                      ) : (
                        <div className="py-2">
                          {searchResults.map((user) => (
                            <button
                              key={user._id}
                              type="button"
                              onClick={() => handleSelectCoLeader(user)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {user.name || "Sin nombre"}
                              </p>
                              <p className="text-xs text-gray-600">{user.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {user.role} • {user.gender === "Male" ? "Hombre" : "Mujer"}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {errors.coLeader && (
              <p className="mt-1 text-sm text-red-500">{errors.coLeader}</p>
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
            <button
              type="button"
              onClick={handleModalClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? "Creando..." : "Crear Grupo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
