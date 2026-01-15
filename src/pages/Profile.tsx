import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiUser, HiMail, HiPhone, HiAcademicCap, HiUserGroup, HiGlobeAlt, HiBookOpen, HiCalendar, HiBriefcase } from "react-icons/hi";
import PageHeader from "../components/PageHeader";
import type { Id } from "../../convex/_generated/dataModel";

export default function Profile() {
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const updateSchoolStatus = useMutation(api.courses.updateSchoolStatus);
  const allServices = useQuery(api.services.getAllServices);
  const assignService = useMutation(api.services.assignServiceToUser);
  const removeService = useMutation(api.services.removeServiceFromUser);

  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gender: "" as "Male" | "Female" | "",
    phone: "",
    birthday: "",
  });

  // Helper para convertir timestamp a formato de fecha (YYYY-MM-DD)
  // Convierte a fecha local para evitar problemas de zona horaria
  const timestampToDateString = (timestamp: number | undefined): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper para convertir formato de fecha (YYYY-MM-DD) a timestamp
  // Usa hora local (inicio del día sin hora) para evitar problemas de zona horaria
  // Mismo patrón que se usa en CoursesAdmin para startDate y endDate
  const dateStringToTimestamp = (dateString: string): number | undefined => {
    if (!dateString) return undefined;
    // Parsear la fecha en formato YYYY-MM-DD
    const [year, month, day] = dateString.split("-").map(Number);
    // Crear fecha en hora local a inicio del día (0:0:0:0) para evitar desfases
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    return date.getTime();
  };

  // Inicializar formData cuando el perfil se carga
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        birthday: timestampToDateString(profile.birthday),
      });
    }
  }, [profile, isEditing]);

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        birthday: timestampToDateString(profile.birthday),
      });
      setIsEditing(true);
      setErrors({});
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        birthday: timestampToDateString(profile.birthday),
      });
    }
    setIsEditing(false);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validaciones
    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (!formData.gender) {
      setErrors({ gender: "Selecciona un género" });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateProfile({
        name: formData.name.trim(),
        gender: formData.gender as "Male" | "Female",
        phone: formData.phone.trim() || undefined,
        birthday: dateStringToTimestamp(formData.birthday),
      });
      setIsEditing(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar el perfil";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSchoolStatus = async () => {
    if (!profile) return;
    try {
      await updateSchoolStatus({ isActiveInSchool: !profile.isActiveInSchool });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error al actualizar el estado de escuela"
      );
    }
  };

  const handleServiceChange = async (serviceId: string) => {
    if (!profile) return;
    try {
      if (serviceId === "") {
        // Remover servicio
        await removeService({});
      } else {
        // Asignar servicio
        await assignService({ serviceId: serviceId as Id<"services"> });
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error al actualizar el área de servicio"
      );
    }
  };

  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal"
        button={
          !isEditing ? (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
            >
              Editar Perfil
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Personal */}
          <div className="bg-white border border-[#e5e5e5] p-6">
            <h2 className="text-xl font-normal text-black mb-6 tracking-tight">
              Información Personal
            </h2>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                  >
                    Nombre *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setErrors({ ...errors, name: "" });
                    }}
                    className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                      errors.name
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                    placeholder="Tu nombre completo"
                  />
                  {errors.name && (
                    <p className="mt-2 text-xs text-[#d32f2f]">{errors.name}</p>
                  )}
                </div>

                {/* Email (solo lectura) */}
                <div>
                  <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#fafafa] border border-[#e5e5e5]">
                    <HiMail className="h-4 w-4 text-[#999999]" />
                    <span className="text-sm font-normal text-[#666666]">{profile.email || "No disponible"}</span>
                  </div>
                  <p className="mt-2 text-xs font-normal text-[#999999]">
                    El email no se puede modificar
                  </p>
                </div>

                {/* Género */}
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                  >
                    Género *
                  </label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        gender: e.target.value as "Male" | "Female",
                      });
                      setErrors({ ...errors, gender: "" });
                    }}
                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                      errors.gender
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                  >
                    <option value="">Selecciona un género</option>
                    <option value="Male">Hombre</option>
                    <option value="Female">Mujer</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-2 text-xs text-[#d32f2f]">{errors.gender}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                  >
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                    }}
                    className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors"
                    placeholder="Ej: +51 999 999 999"
                  />
                </div>

                {/* Fecha de Cumpleaños */}
                <div>
                  <label
                    htmlFor="birthday"
                    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                  >
                    Fecha de Cumpleaños
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => {
                      setFormData({ ...formData, birthday: e.target.value });
                    }}
                    className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black focus:outline-none focus:border-black transition-colors"
                  />
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
                    onClick={handleCancel}
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
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <HiUser className="h-5 w-5 text-[#999999]" />
                  <div>
                    <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Nombre</p>
                    <p className="text-sm font-normal text-black mt-1">
                      {profile.name || "No especificado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HiMail className="h-5 w-5 text-[#999999]" />
                  <div>
                    <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Email</p>
                    <p className="text-sm font-normal text-black mt-1">
                      {profile.email || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HiUserGroup className="h-5 w-5 text-[#999999]" />
                  <div>
                    <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Género</p>
                    <p className="text-sm font-normal text-black mt-1">
                      {profile.gender === "Male" ? "Hombre" : profile.gender === "Female" ? "Mujer" : "No especificado"}
                    </p>
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <HiPhone className="h-5 w-5 text-[#999999]" />
                    <div>
                      <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Teléfono</p>
                      <p className="text-sm font-normal text-black mt-1">
                        {profile.phone}
                      </p>
                    </div>
                  </div>
                )}

                {profile.birthday && (
                  <div className="flex items-center gap-3">
                    <HiCalendar className="h-5 w-5 text-[#999999]" />
                    <div>
                      <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Fecha de Cumpleaños</p>
                      <p className="text-sm font-normal text-black mt-1">
                        {new Date(profile.birthday).toLocaleDateString("es-PE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <HiAcademicCap className="h-5 w-5 text-[#999999]" />
                  <div>
                    <p className="text-xs font-normal text-[#666666] uppercase tracking-wide">Rol</p>
                    <p className="text-sm font-normal text-black mt-1">
                      {profile.role === "Pastor" ? "Pastor" : "Miembro"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estado de Escuela */}
          <div className="bg-white border border-[#e5e5e5] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-normal text-black mb-2 tracking-tight">
                  Estado en Escuela
                </h2>
                <p className="text-sm font-normal text-[#666666]">
                  {profile.isActiveInSchool
                    ? "Actualmente estás activo en la escuela"
                    : "No estás activo en la escuela"}
                </p>
              </div>
              <button
                onClick={handleToggleSchoolStatus}
                className={`px-6 py-2 border font-normal text-sm transition-colors ${
                  profile.isActiveInSchool
                    ? "bg-green-50 text-black border-green-200 hover:bg-green-100"
                    : "bg-[#fafafa] text-black border-[#e5e5e5] hover:bg-[#f5f5f5]"
                }`}
              >
                {profile.isActiveInSchool ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>

          {/* Estado en Servicio */}
          <div className="bg-white border border-[#e5e5e5] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-normal text-black mb-2 tracking-tight flex items-center gap-2">
                  <HiBriefcase className="h-5 w-5 text-purple-700" />
                  Área de Servicio
                </h2>
                <p className="text-sm font-normal text-[#666666]">
                  {profile.service
                    ? `Estás sirviendo en: ${profile.service.name}`
                    : "No estás asignado a ningún área de servicio"}
                </p>
              </div>
            </div>
            {allServices === undefined ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent"></div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="service"
                  className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                >
                  Selecciona tu área de servicio
                </label>
                <select
                  id="service"
                  value={profile.service?._id || ""}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black focus:outline-none focus:border-black transition-colors"
                >
                  <option value="">Sin área de servicio</option>
                  {allServices.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {profile.service && (
                  <div className="mt-3 inline-flex items-center px-3 py-1 bg-purple-50 text-black border border-purple-200 text-sm font-normal">
                    {profile.service.name}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar con información adicional */}
        <div className="space-y-6">
          {/* Cursos */}
          {profile.courses && profile.courses.length > 0 && (
            <div className="bg-white border border-[#e5e5e5] p-6">
              <h3 className="text-lg font-normal text-black mb-4 tracking-tight flex items-center gap-2">
                <HiBookOpen className="h-5 w-5 text-blue-700" />
                Mis Cursos
              </h3>
              <div className="space-y-2">
                {profile.courses.map((course) => (
                  <div
                    key={course._id}
                    className="p-3 bg-blue-50 border border-blue-200"
                  >
                    <p className="font-normal text-black text-sm">{course.name}</p>
                    {course.description && (
                      <p className="text-xs font-normal text-[#666666] mt-1">
                        {course.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red */}
          {profile.grid && (
            <div className="bg-white border border-[#e5e5e5] p-6">
              <h3 className="text-lg font-normal text-black mb-4 tracking-tight flex items-center gap-2">
                <HiGlobeAlt className="h-5 w-5 text-blue-700" />
                Mi Red
              </h3>
              <p className="font-normal text-black text-sm">{profile.grid.name}</p>
            </div>
          )}

          {/* Líder */}
          {profile.leader && (
            <div className="bg-white border border-[#e5e5e5] p-6">
              <h3 className="text-lg font-normal text-black mb-4 tracking-tight flex items-center gap-2">
                <HiUser className="h-5 w-5 text-blue-700" />
                Mi Líder
              </h3>
              <p className="font-normal text-black text-sm">
                {profile.leader.name || profile.leader.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

