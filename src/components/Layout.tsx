import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  HiHome,
  HiUsers,
  HiGlobeAlt,
  HiMenu,
  HiX,
  HiLogout,
  HiUser,
  HiAcademicCap,
  HiBookOpen,
  HiClipboardList,
  HiCalendar,
} from "react-icons/hi";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: HiHome },
  { name: "Mi Grupo", href: "/my-group", icon: HiUser },
  { name: "Mis Grupos", href: "/groups", icon: HiUsers },
  { name: "Actividades", href: "/activities", icon: HiCalendar },
  { name: "Escuela", href: "/school", icon: HiAcademicCap },
  { name: "Registros", href: "/records", icon: HiClipboardList },
];

const adminNavigation = [
  { name: "Cursos", href: "/courses-admin", icon: HiBookOpen },
  { name: "Redes", href: "/grid", icon: HiGlobeAlt },
];

const pastorNavigation = [
  { name: "Mi Red", href: "/grid", icon: HiGlobeAlt },
];

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const profile = useQuery(api.users.getMyProfile);

  // Combinar navegación según el rol del usuario
  let navigation = [...baseNavigation];
  
  if (profile?.isAdmin) {
    // Administradores ven todas las secciones admin
    navigation = [ ...adminNavigation];
  } else if (profile?.role === "Pastor") {
    // Pastores ven "Mi Red" en lugar de "Redes"
    navigation = [...navigation, ...pastorNavigation];
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sidebar móvil */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="fixed inset-0 bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 flex w-72 flex-col bg-white border-r border-[#e5e5e5] transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header móvil */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center ">
                <img src="/logo.png" alt="Radar Cervantes" className="w-10" />
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-[#666666] hover:text-black transition-colors p-2 hover:bg-[#fafafa]"
            >
              <HiX className="h-6 w-6" />
            </button>
          </div>

          {/* Navegación móvil */}
          <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 text-sm font-normal transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "text-[#666666] hover:text-black hover:bg-[#fafafa]"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer móvil */}
          <div className="border-t border-[#e5e5e5] px-4 py-4 space-y-2">
            {/* Perfil del usuario */}
            {profile && (
              <Link
                to="/profile"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 text-sm font-normal transition-colors ${
                  location.pathname === "/profile"
                    ? "bg-black text-white"
                    : "text-[#666666] hover:text-black hover:bg-[#fafafa]"
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-black flex-shrink-0">
                  <span className="text-white text-xs font-normal">
                    {profile.name
                      ? profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : profile.email?.[0].toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-normal truncate text-sm">
                    {profile.name || "Usuario"}
                  </p>
                  <p className="text-xs truncate">
                    {profile.email || ""}
                  </p>
                </div>
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-4 px-4 py-3 text-sm font-normal text-[#666666] hover:text-black hover:bg-[#fafafa] transition-colors"
            >
              <HiLogout className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-[#e5e5e5]">
          {/* Header desktop */}
          <div className="flex h-20 items-center px-6 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center ">
                <img src="/logo.png" alt="Radar Cervantes" className="w-10" />
              </div>
            </div>
          </div>

          {/* Navegación desktop */}
          <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-4 px-4 py-3 text-sm font-normal transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "text-[#666666] hover:text-black hover:bg-[#fafafa]"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer desktop */}
          <div className="border-t border-[#e5e5e5] px-4 py-4 space-y-2">
            {/* Perfil del usuario */}
            {profile && (
              <Link
                to="/profile"
                className={`flex items-center gap-4 px-4 py-3 text-sm font-normal transition-colors ${
                  location.pathname === "/profile"
                    ? "bg-black text-white"
                    : "text-[#666666] hover:text-black hover:bg-[#fafafa]"
                }`}
              >
                <div className="flex items-center justify-center w-10 h-10 bg-black flex-shrink-0">
                  <span className="text-white text-sm font-normal">
                    {profile.name
                      ? profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : profile.email?.[0].toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-normal truncate text-sm">
                    {profile.name || "Usuario"}
                  </p>
                  <p className="text-xs  truncate">
                    {profile.email || ""}
                  </p>
                </div>
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-4 px-4 py-3 text-sm font-normal text-[#666666] hover:text-black hover:bg-[#fafafa] transition-colors"
            >
              <HiLogout className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-72">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-[#e5e5e5] bg-white px-4 sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-[#666666] hover:text-black lg:hidden hover:bg-[#fafafa] transition-colors"
          >
            <HiMenu className="h-6 w-6" />
          </button>
        
        </div>

        {/* Contenido */}
        <main className="py-6 min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
