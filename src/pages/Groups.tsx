import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { HiPlus, HiUsers, HiLocationMarker, HiClipboardCopy, HiCheck, HiSearch, HiX } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
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
  const navigate = useNavigate();
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
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Grupos"
        description="Grupos donde eres líder"
        button={
          <button
            onClick={handleModalOpen}
            className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
          >
            <HiPlus className="h-5 w-5" />
            Crear Grupo
          </button>
        }
      />

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
            <HiUsers className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
            No has creado ningún grupo
          </h3>
          <p className="text-sm font-normal text-[#666666] mb-8">
            Crea tu primer grupo de conexión para comenzar a liderar.
          </p>
          <button
            onClick={handleModalOpen}
            className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
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
              onClick={() => navigate(`/groups/${group._id}`)}
              className="bg-white border border-[#e5e5e5] p-6 hover:border-black transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-normal text-black mb-1 tracking-tight">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm font-normal text-[#666666] mb-1">
                    <HiLocationMarker className="h-4 w-4" />
                    <span>{group.address}</span>
                  </div>
                  <p className="text-sm font-normal text-[#666666]">{group.district}</p>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mb-4 space-y-2 text-sm">
                {group.minAge && group.maxAge && (
                  <p className="font-normal text-[#666666]">
                    <span className="font-normal text-black">Edad:</span> {group.minAge} - {group.maxAge} años
                  </p>
                )}
                <p className="font-normal text-[#666666]">
                  <span className="font-normal text-black">Día:</span> {group.day}
                </p>
                <p className="font-normal text-[#666666]">
                  <span className="font-normal text-black">Hora:</span> {group.time}
                </p>
              </div>

              {/* Código de invitación */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-normal text-[#666666] mb-1 uppercase tracking-wide">
                      Código de Invitación
                    </p>
                    <p className="text-lg font-mono font-normal text-black">
                      {group.invitationCode}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyInvitationCode(group.invitationCode);
                    }}
                    className="p-2 hover:bg-blue-100 transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode === group.invitationCode ? (
                      <HiCheck className="h-5 w-5 text-black" />
                    ) : (
                      <HiClipboardCopy className="h-5 w-5 text-[#666666]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Líderes */}
              <div className="mb-4">
                <p className="text-xs font-normal text-black mb-2 uppercase tracking-wide">Líderes</p>
                <div className="flex flex-wrap gap-2">
                  {group.leaders
                    .filter((leader): leader is NonNullable<typeof leader> => leader !== null)
                    .map((leader) => (
                      <span
                        key={leader._id}
                        className="inline-flex items-center px-3 py-1 bg-blue-50 text-black border border-blue-200 text-sm font-normal"
                      >
                        {leader.name || leader.email}
                      </span>
                    ))}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#e5e5e5]">
                <div className="flex items-center gap-2">
                  <HiUsers className="h-5 w-5 text-[#999999]" />
                  <span className="text-sm font-normal text-[#666666]">
                    <span className="font-normal text-black">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre del grupo */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
            >
              Nombre del Grupo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                errors.name
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
              }`}
              placeholder="Ej: Grupo de Conexión Norte"
            />
            {errors.name && (
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.name}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label
              htmlFor="address"
              className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
            >
              Dirección *
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                errors.address
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
              }`}
              placeholder="Ej: Av. Principal 123"
            />
            {errors.address && (
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.address}</p>
            )}
          </div>

          {/* Distrito */}
          <div>
            <label
              htmlFor="district"
              className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
            >
              Distrito *
            </label>
            <select
              id="district"
              name="district"
              required
              className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                errors.district
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
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
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.district}</p>
            )}
          </div>

          {/* Rango de edad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="minAge"
                className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
              >
                Edad Mínima
              </label>
              <input
                id="minAge"
                name="minAge"
                type="number"
                min="0"
                max="100"
                className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                  errors.age
                    ? "border-[#d32f2f]"
                    : "border-[#e5e5e5]"
                }`}
                placeholder="Ej: 18"
              />
            </div>
            <div>
              <label
                htmlFor="maxAge"
                className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
              >
                Edad Máxima
              </label>
              <input
                id="maxAge"
                name="maxAge"
                type="number"
                min="0"
                max="100"
                className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                  errors.age
                    ? "border-[#d32f2f]"
                    : "border-[#e5e5e5]"
                }`}
                placeholder="Ej: 35"
              />
            </div>
          </div>
          {errors.age && (
            <p className="text-xs text-[#d32f2f] -mt-3">{errors.age}</p>
          )}

          {/* Día */}
          <div>
            <label
              htmlFor="day"
              className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
            >
              Día de la Semana *
            </label>
            <select
              id="day"
              name="day"
              required
              className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                errors.day
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
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
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.day}</p>
            )}
          </div>

          {/* Hora */}
          <div>
            <label
              htmlFor="time"
              className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
            >
              Hora *
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
              className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                errors.time
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
              }`}
            />
            {errors.time && (
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.time}</p>
            )}
          </div>

          {/* Co-líder (buscador) */}
          <div>
            <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
              Co-líder <span className="text-[#999999] font-normal normal-case">(Opcional)</span>
            </label>
            <p className="text-xs font-normal text-[#666666] mb-3">
              Busca un usuario por email para agregarlo como co-líder. Debe ser
              de diferente género al tuyo.
            </p>
            
            <div className="relative" ref={searchRef}>
              {selectedCoLeader ? (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200">
                  <div>
                    <p className="text-sm font-normal text-black">
                      {selectedCoLeader.name || "Sin nombre"}
                    </p>
                    <p className="text-xs font-normal text-[#666666]">{selectedCoLeader.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoLeader}
                    className="p-1 hover:bg-blue-100 transition-colors"
                  >
                    <HiX className="h-4 w-4 text-black" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiSearch className="h-4 w-4 text-[#999999]" />
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
                      className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                        errors.coLeader
                          ? "border-[#d32f2f]"
                          : "border-[#e5e5e5]"
                      }`}
                      placeholder="Buscar por email..."
                    />
                  </div>

                  {/* Resultados de búsqueda */}
                  {showSearchResults && coLeaderSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-60 overflow-y-auto">
                      {searchResults === undefined ? (
                        <div className="p-4 text-center text-sm font-normal text-[#666666]">
                          Buscando...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm font-normal text-[#666666]">
                          No se encontraron usuarios con ese correo
                        </div>
                      ) : (
                        <div>
                          {searchResults.map((user) => (
                            <button
                              key={user._id}
                              type="button"
                              onClick={() => handleSelectCoLeader(user)}
                              className="w-full px-4 py-3 text-left hover:bg-[#fafafa] transition-colors border-b border-[#e5e5e5] last:border-b-0"
                            >
                              <p className="text-sm font-normal text-black">
                                {user.name || "Sin nombre"}
                              </p>
                              <p className="text-xs font-normal text-[#666666]">{user.email}</p>
                              <p className="text-xs font-normal text-[#999999] mt-1">
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
              <p className="mt-2 text-xs text-[#d32f2f]">{errors.coLeader}</p>
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
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isSubmitting ? "Creando..." : "Crear Grupo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
