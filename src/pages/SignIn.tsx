import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect, useRef } from "react";
import { HiMail, HiLockClosed, HiUser,  HiSearch, HiX } from "react-icons/hi";
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
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center">
            <img src="/logo.png" alt="Crossmunity" className="h-24 w-24 mb-2" />
          </div>
          <h1 className="text-3xl font-normal text-black mb-2 tracking-tight">Crossmunity</h1>
          <p className="text-sm text-[#666666] font-normal">
            {step === "signIn"
              ? "Bienvenido de vuelta"
              : "Crea tu cuenta para comenzar"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e5e5e5] p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                >
                  Nombre completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUser className="h-4 w-4 text-[#999999]" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                      errors.name
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                    placeholder="Juan Pérez"
                  />
                </div>
                {errors.name && (
                  <p className="mt-2 text-xs text-[#d32f2f]">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiMail className="h-4 w-4 text-[#999999]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                    className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                      errors.email
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-xs text-[#d32f2f]">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiLockClosed className="h-4 w-4 text-[#999999]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                    className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                      errors.password
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                  placeholder={step === "signIn" ? "••••••••" : "Mínimo 6 caracteres"}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-[#d32f2f]">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiLockClosed className="h-4 w-4 text-[#999999]" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                      errors.confirmPassword
                        ? "border-[#d32f2f]"
                        : "border-[#e5e5e5]"
                    }`}
                    placeholder="Repite tu contraseña"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-[#d32f2f]">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Role field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                  Rol
                </label>
                <div className="relative">
                  <div className="flex border border-[#e5e5e5]">
                    <button
                      type="button"
                      onClick={() => {
                        setRole("Member");
                        setErrors((prev) => ({ ...prev, role: "" }));
                      }}
                      className={`flex-1 py-3 px-4 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                        role === "Member"
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-[#fafafa]"
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
                      className={`flex-1 py-3 px-4 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                        role === "Pastor"
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-[#fafafa]"
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
                  <p className="mt-2 text-xs text-[#d32f2f]">{errors.role}</p>
                )}
              </div>
            )}

            {/* Gender field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label
                  htmlFor="gender"
                  className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
                >
                  Género
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                    errors.gender
                      ? "border-[#d32f2f]"
                      : "border-[#e5e5e5]"
                  }`}
                >
                  <option value="">Selecciona tu género</option>
                  <option value="Male">Hombre</option>
                  <option value="Female">Mujer</option>
                </select>
                {errors.gender && (
                  <p className="mt-2 text-xs text-[#d32f2f]">{errors.gender}</p>
                )}
              </div>
            )}

            {/* Grid/Red field (only for sign up) */}
            {step === "signUp" && (
              <div>
                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                  Red <span className="text-[#999999] font-normal normal-case">(opcional)</span>
                </label>
                <p className="text-xs text-[#666666] mb-3 font-normal">
                  Busca y selecciona la red a la que perteneces (opcional)
                </p>
                
                <div className="relative" ref={gridSearchRef}>
                  {selectedGrid ? (
                    <div className="flex items-center justify-between px-4 py-3 bg-[#fafafa] border border-[#e5e5e5]">
                      <div>
                        <p className="text-sm font-normal text-black">
                          {selectedGrid.name}
                        </p>
                        {selectedGrid.pastor && (
                          <p className="text-xs text-[#666666] mt-1">
                            Pastor: {selectedGrid.pastor.name || selectedGrid.pastor.email}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveGrid}
                        className="p-1 hover:bg-[#e5e5e5] transition-colors"
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
                          className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                            errors.grid
                              ? "border-[#d32f2f]"
                              : "border-[#e5e5e5]"
                          }`}
                          placeholder="Buscar red por nombre..."
                        />
                      </div>

                      {/* Resultados de búsqueda */}
                      {showGridResults && gridSearch.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-60 overflow-y-auto">
                          {gridSearchResults === undefined ? (
                            <div className="p-4 text-center text-sm text-[#666666]">
                              Buscando...
                            </div>
                          ) : gridSearchResults.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[#666666]">
                              No se encontraron redes con ese nombre
                            </div>
                          ) : (
                            <div>
                              {gridSearchResults.map((grid) => (
                                <button
                                  key={grid._id}
                                  type="button"
                                  onClick={() => handleSelectGrid(grid)}
                                  className="w-full px-4 py-3 text-left hover:bg-[#fafafa] transition-colors border-b border-[#e5e5e5] last:border-b-0"
                                >
                                  <p className="text-sm font-normal text-black">
                                    {grid.name}
                                  </p>
                                  {grid.pastor && (
                                    <p className="text-xs text-[#666666] mt-1">
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
                  <p className="mt-2 text-xs text-[#d32f2f]">{errors.grid}</p>
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
              <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
                <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-3 px-4 font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isLoading
                ? "Procesando..."
                : step === "signIn"
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
            </button>
          </form>

          {/* Toggle between sign in and sign up */}
          <div className="mt-8 text-center">
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
              className="text-xs text-[#666666] font-normal transition-colors hover:text-black"
            >
              {step === "signIn" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <span className="text-black hover:underline">
                    Regístrate aquí
                  </span>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <span className="text-black hover:underline">
                    Inicia sesión aquí
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

       
      </div>
    </div>
  );
}
