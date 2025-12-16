import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiUser, HiMail, HiPhone, HiAcademicCap, HiUserGroup, HiGlobeAlt, HiBookOpen } from "react-icons/hi";

export default function Profile() {
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const updateSchoolStatus = useMutation(api.courses.updateSchoolStatus);

  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gender: "" as "Male" | "Female" | "",
    phone: "",
  });

  // Inicializar formData cuando el perfil se carga
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, isEditing]);

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
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

  if (profile === undefined) {
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
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona tu información personal
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Editar Perfil
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Personal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Información Personal
            </h2>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nombre */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                    className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                    placeholder="Tu nombre completo"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* Email (solo lectura) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <HiMail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">{profile.email || "No disponible"}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    El email no se puede modificar
                  </p>
                </div>

                {/* Género */}
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                    className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.gender
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                  >
                    <option value="">Selecciona un género</option>
                    <option value="Male">Hombre</option>
                    <option value="Female">Mujer</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                    placeholder="Ej: +51 999 999 999"
                  />
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
                    onClick={handleCancel}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <HiUser className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {profile.name || "No especificado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HiMail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {profile.email || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HiUserGroup className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Género</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {profile.gender === "Male" ? "Hombre" : profile.gender === "Female" ? "Mujer" : "No especificado"}
                    </p>
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <HiPhone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {profile.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <HiAcademicCap className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Rol</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {profile.role === "Pastor" ? "Pastor" : "Miembro"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estado de Escuela */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Estado en Escuela
                </h2>
                <p className="text-sm text-gray-600">
                  {profile.isActiveInSchool
                    ? "Actualmente estás activo en la escuela"
                    : "No estás activo en la escuela"}
                </p>
              </div>
              <button
                onClick={handleToggleSchoolStatus}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  profile.isActiveInSchool
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {profile.isActiveInSchool ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar con información adicional */}
        <div className="space-y-6">
          {/* Cursos */}
          {profile.courses && profile.courses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiBookOpen className="h-5 w-5 text-blue-500" />
                Mis Cursos
              </h3>
              <div className="space-y-2">
                {profile.courses.map((course) => (
                  <div
                    key={course._id}
                    className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200"
                  >
                    <p className="font-medium text-gray-900">{course.name}</p>
                    {course.description && (
                      <p className="text-xs text-gray-600 mt-1">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiGlobeAlt className="h-5 w-5 text-blue-500" />
                Mi Red
              </h3>
              <p className="font-medium text-gray-900">{profile.grid.name}</p>
            </div>
          )}

          {/* Líder */}
          {profile.leader && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiUser className="h-5 w-5 text-blue-500" />
                Mi Líder
              </h3>
              <p className="font-medium text-gray-900">
                {profile.leader.name || profile.leader.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

