import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect, useRef } from "react";
import { HiMail, HiLockClosed, HiUser, HiSparkles, HiSearch, HiX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<"Pastor" | "Member" | "">("Member");
  const navigate = useNavigate();

  // Estados para el buscador de red
  const [gridSearch, setGridSearch] = useState("");
  const [gridId, setGridId] = useState<Id<"grids"> | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<{
    _id: Id<"grids">;
    name: string;
    pastor: { name?: string; email?: string } | null;
  } | null>(null);
  const [showGridResults, setShowGridResults] = useState(false);
  const gridSearchRef = useRef<HTMLDivElement>(null);

  // Buscar redes mientras se escribe
  const gridSearchResults = useQuery(
    api.grids.searchGridsByName,
    gridSearch.length >= 2 ? { searchTerm: gridSearch } : "skip"
  );

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gridSearchRef.current && !gridSearchRef.current.contains(event.target as Node)) {
        setShowGridResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === "signUp") {
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      const role = formData.get("role") as string;
      const gender = formData.get("gender") as string;

      if (!name || name.trim().length < 2) {
        newErrors.name = "El nombre debe tener al menos 2 caracteres";
      }

      if (!email || !email.includes("@")) {
        newErrors.email = "Ingresa un email válido";
      }

      if (!password || password.length < 6) {
        newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }

      if (!role) {
        newErrors.role = "Selecciona un rol";
      }

      if (!gender) {
        newErrors.gender = "Selecciona un género";
      }
    } else {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      if (!email || !email.includes("@")) {
        newErrors.email = "Ingresa un email válido";
      }

      if (!password) {
        newErrors.password = "Ingresa tu contraseña";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectGrid = (grid: {
    _id: Id<"grids">;
    name: string;
    pastor: { name?: string; email?: string } | null;
  }) => {
    setSelectedGrid(grid);
    setGridId(grid._id);
    setGridSearch(grid.name);
    setShowGridResults(false);
    setErrors((prev) => ({ ...prev, grid: "" }));
  };

  const handleRemoveGrid = () => {
    setSelectedGrid(null);
    setGridId(null);
    setGridSearch("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!validateForm(formData)) {
      return;
    }

    // Agregar gridId al formData si existe
    if (gridId && step === "signUp") {
      formData.append("gridId", gridId);
    }

    setIsLoading(true);
    try {
      await signIn("password", formData);
      console.log("signIn successful");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      setErrors({ submit: "Error al iniciar sesión. Intenta nuevamente." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-200 to-blue-200 rounded-2xl mb-4 shadow-lg">
            <HiSparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Crossmunity</h1>
          <p className="text-gray-600">
            {step === "signIn"
              ? "Bienvenido de vuelta"
              : "Crea tu cuenta para comenzar"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nombre completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                    placeholder="Juan Pérez"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiLockClosed className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.password
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                  placeholder={step === "signIn" ? "••••••••" : "Mínimo 6 caracteres"}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiLockClosed className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.confirmPassword
                        ? "border-red-300 focus:ring-red-200"
                        : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                    }`}
                    placeholder="Repite tu contraseña"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Role field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <div className="relative">
                  <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setRole("Member");
                        setErrors((prev) => ({ ...prev, role: "" }));
                      }}
                      className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200 relative ${
                        role === "Member"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Miembro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRole("Pastor");
                        setErrors((prev) => ({ ...prev, role: "" }));
                      }}
                      className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200 relative ${
                        role === "Pastor"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Pastor
                    </button>
                  </div>
                  <input
                    name="role"
                    type="hidden"
                    value={role}
                    required
                  />
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-500">{errors.role}</p>
                )}
              </div>
            )}

            {/* Gender field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="gender"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Género
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className={`block w-full px-4 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.gender
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                  }`}
                >
                  <option value="">Selecciona tu género</option>
                  <option value="Male">Hombre</option>
                  <option value="Female">Mujer</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                )}
              </div>
            )}

            {/* Grid/Red field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Red <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Busca y selecciona la red a la que perteneces (opcional)
                </p>
                
                <div className="relative" ref={gridSearchRef}>
                  {selectedGrid ? (
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGrid.name}
                        </p>
                        {selectedGrid.pastor && (
                          <p className="text-xs text-gray-600">
                            Pastor: {selectedGrid.pastor.name || selectedGrid.pastor.email}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveGrid}
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
                          value={gridSearch}
                          onChange={(e) => {
                            setGridSearch(e.target.value);
                            setShowGridResults(true);
                            setErrors((prev) => ({ ...prev, grid: "" }));
                          }}
                          onFocus={() => {
                            if (gridSearch.length >= 2) {
                              setShowGridResults(true);
                            }
                          }}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                            errors.grid
                              ? "border-red-300 focus:ring-red-200"
                              : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                          }`}
                          placeholder="Buscar red por nombre..."
                        />
                      </div>

                      {/* Resultados de búsqueda */}
                      {showGridResults && gridSearch.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {gridSearchResults === undefined ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              Buscando...
                            </div>
                          ) : gridSearchResults.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              No se encontraron redes con ese nombre
                            </div>
                          ) : (
                            <div className="py-2">
                              {gridSearchResults.map((grid) => (
                                <button
                                  key={grid._id}
                                  type="button"
                                  onClick={() => handleSelectGrid(grid)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-900">
                                    {grid.name}
                                  </p>
                                  {grid.pastor && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Pastor: {grid.pastor.name || grid.pastor.email}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {errors.grid && (
                  <p className="mt-1 text-sm text-red-500">{errors.grid}</p>
                )}
                <input
                  name="gridId"
                  type="hidden"
                  value={gridId || ""}
                />
              </div>
            )}

            {/* Hidden flow field */}
            <input name="flow" type="hidden" value={step} />

            {/* Submit error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading
                ? "Procesando..."
                : step === "signIn"
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
            </button>
          </form>

          {/* Toggle between sign in and sign up */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setStep(step === "signIn" ? "signUp" : "signIn");
                setErrors({});
                setRole("Member");
                setGridSearch("");
                setGridId(null);
                setSelectedGrid(null);
                setShowGridResults(false);
              }}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              {step === "signIn" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <span className="font-semibold text-blue-600">
                    Regístrate aquí
                  </span>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <span className="font-semibold text-blue-600">
                    Inicia sesión aquí
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  );
}
