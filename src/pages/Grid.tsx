import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiGlobeAlt, HiUsers, HiAcademicCap, HiUserGroup, HiPlus, HiPencil, HiTrash, HiX, HiSearch } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import type { Id } from "../../convex/_generated/dataModel";

const Grid = () => {
  const profile = useQuery(api.users.getMyProfile);
  
  // Verificar que el usuario sea admin o pastor
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si es admin, mostrar vista de todas las redes
  if (profile.isAdmin) {
    return <AdminGridView />;
  }

  // Si es pastor, mostrar vista de su red
  if (profile.role === "Pastor") {
    return <PastorGridView />;
  }

  // Si no es admin ni pastor, mostrar mensaje de acceso denegado
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Acceso Denegado
        </h3>
        <p className="text-gray-600">
          Solo los administradores y pastores pueden acceder a esta sección.
        </p>
      </div>
    </div>
  );
};

// Vista para administradores: muestra todas las redes
function AdminGridView() {
  const grids = useQuery(api.grids.getAllGrids);
  const pastors = useQuery(api.users.getPastors);
  const createGrid = useMutation(api.grids.createGridForAdmin);
  const updateGrid = useMutation(api.grids.updateGridForAdmin);
  const deleteGrid = useMutation(api.grids.deleteGrid);
  const addMember = useMutation(api.grids.addMemberToGridForAdmin);
  const removeMember = useMutation(api.grids.removeMemberFromGridForAdmin);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [editingGrid, setEditingGrid] = useState<Id<"grids"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", pastorId: "" as Id<"users"> | "" });
  
  // Estados para agregar miembros
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<Id<"grids"> | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.users.searchUsersByEmail,
    memberSearch.length >= 2 ? { searchTerm: memberSearch } : "skip"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateModal(true);
    setEditingGrid(null);
    setFormData({ name: "", pastorId: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (grid: { _id: Id<"grids">; name: string }) => {
    setIsCreateModal(false);
    setEditingGrid(grid._id);
    setFormData({ name: grid.name, pastorId: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreateModal(false);
    setEditingGrid(null);
    setFormData({ name: "", pastorId: "" });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (isCreateModal && !formData.pastorId) {
      setErrors({ pastorId: "Debes seleccionar un pastor" });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isCreateModal) {
        await createGrid({
          name: formData.name.trim(),
          pastorId: formData.pastorId as Id<"users">,
        });
      } else if (editingGrid) {
        await updateGrid({
          gridId: editingGrid,
          name: formData.name.trim(),
        });
      }
      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la red";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (gridId: Id<"grids">) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta red? Esta acción removerá a todos los miembros de la red.")) {
      return;
    }

    try {
      await deleteGrid({ gridId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar la red");
    }
  };

  const handleOpenAddMemberModal = (gridId: Id<"grids">) => {
    setSelectedGridId(gridId);
    setMemberEmail("");
    setMemberSearch("");
    setErrors({});
    setShowAddMemberModal(true);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGridId) return;

    setIsSubmitting(true);
    setErrors({});

    if (!memberEmail || !memberEmail.trim()) {
      setErrors({ email: "Debes ingresar un email" });
      setIsSubmitting(false);
      return;
    }

    try {
      await addMember({
        gridId: selectedGridId,
        userEmail: memberEmail.trim(),
      });
      setShowAddMemberModal(false);
      setMemberEmail("");
      setMemberSearch("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al agregar miembro";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (gridId: Id<"grids">, memberId: Id<"users">) => {
    if (!confirm("¿Estás seguro de que quieres remover a este miembro de la red?")) {
      return;
    }

    try {
      await removeMember({ gridId, memberId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al remover miembro");
    }
  };

  if (grids === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redes"
        description="Gestiona todas las redes de la plataforma"
        button={
          <Button
            onClick={handleOpenCreateModal}
            icon={<HiPlus className="h-4 w-4" />}
          >
            Crear Red
          </Button>
        }
      />

      {grids.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiGlobeAlt className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay redes creadas
          </h3>
          <p className="text-gray-600">
            Las redes serán creadas por los pastores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grids.map((grid) => (
            <GridCard
              key={grid._id}
              grid={grid}
              isAdmin={true}
              onEdit={() => handleOpenEditModal(grid)}
              onDelete={() => handleDelete(grid._id)}
              onAddMember={() => handleOpenAddMemberModal(grid._id)}
              onRemoveMember={(memberId) => handleRemoveMember(grid._id, memberId)}
            />
          ))}
        </div>
      )}

      {/* Modal para crear/editar red */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isCreateModal ? "Crear Red" : "Editar Red"}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Red *
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
              placeholder="Ej: Red Norte"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {isCreateModal && (
            <div>
              <label htmlFor="pastorId" className="block text-sm font-medium text-gray-700 mb-2">
                Asignar a Pastor *
              </label>
              <select
                id="pastorId"
                value={formData.pastorId}
                onChange={(e) => {
                  setFormData({ ...formData, pastorId: e.target.value as Id<"users"> | "" });
                  setErrors({ ...errors, pastorId: "" });
                }}
                className={`block w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.pastorId
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                required={isCreateModal}
              >
                <option value="">Selecciona un pastor</option>
                {pastors?.map((pastor) => (
                  <option key={pastor._id} value={pastor._id}>
                    {pastor.name || pastor.email} {pastor.email ? `(${pastor.email})` : ""}
                  </option>
                ))}
              </select>
              {errors.pastorId && <p className="mt-1 text-sm text-red-500">{errors.pastorId}</p>}
              {pastors?.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">No hay pastores disponibles</p>
              )}
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleCloseModal}
              variant="outline"
              rounded="xl"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              rounded="xl"
              fullWidth
            >
              {isSubmitting ? (isCreateModal ? "Creando..." : "Guardando...") : (isCreateModal ? "Crear Red" : "Guardar Cambios")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar miembro */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setMemberEmail("");
          setMemberSearch("");
          setErrors({});
        }}
        title="Agregar Miembro a la Red"
        maxWidth="xl"
      >
        <form onSubmit={handleAddMember} className="p-6 space-y-5">
          <div className="relative" ref={searchRef}>
            <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email del Usuario *
            </label>
            <div className="relative">
              <input
                id="memberEmail"
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberEmail(e.target.value);
                  setShowSearchResults(true);
                  setErrors({ ...errors, email: "" });
                }}
                className={`block w-full px-4 py-3 pl-10 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Buscar por email..."
                required
              />
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => {
                      setMemberEmail(user.email || "");
                      setMemberSearch(user.email || "");
                      setShowSearchResults(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{user.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberEmail("");
                setMemberSearch("");
                setErrors({});
              }}
              variant="outline"
              rounded="xl"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              rounded="xl"
              fullWidth
            >
              {isSubmitting ? "Agregando..." : "Agregar Miembro"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Vista para pastores: muestra solo su red
function PastorGridView() {
  const myGrid = useQuery(api.grids.getMyGrid);
  const members = useQuery(api.grids.getGridMembers);
  const stats = useQuery(api.grids.getGridStats);
  const updateGrid = useMutation(api.grids.updateGrid);
  const addMember = useMutation(api.grids.addMemberToGrid);
  const removeMember = useMutation(api.grids.removeMemberFromGrid);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.users.searchUsersByEmail,
    memberSearch.length >= 2 ? { searchTerm: memberSearch } : "skip"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenEditModal = () => {
    if (!myGrid) return;
    setFormData({ name: myGrid.name });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "" });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!myGrid) return;

    setIsSubmitting(true);
    setErrors({});

    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateGrid({
        gridId: myGrid._id,
        name: formData.name.trim(),
      });
      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la red";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!memberEmail || !memberEmail.trim()) {
      setErrors({ email: "Debes ingresar un email" });
      setIsSubmitting(false);
      return;
    }

    try {
      await addMember({
        userEmail: memberEmail.trim(),
      });
      setShowAddMemberModal(false);
      setMemberEmail("");
      setMemberSearch("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al agregar miembro";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: Id<"users">) => {
    if (!confirm("¿Estás seguro de que quieres remover a este miembro de tu red?")) {
      return;
    }

    try {
      await removeMember({ memberId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al remover miembro");
    }
  };

  if (myGrid === undefined || members === undefined || stats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si no tiene red, mostrar mensaje informativo
  if (!myGrid) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi Red"
          description="Gestiona tu red y sus miembros"
        />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-4">
            <HiGlobeAlt className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes una red asignada
          </h3>
          <p className="text-gray-600">
            Contacta a un administrador para que te asigne una red.
          </p>
        </div>
      </div>
    );
  }

  // Si tiene red, mostrar información y opciones de edición
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Red"
        description="Gestiona tu red y sus miembros"
        button={
          <div className="flex gap-3">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <HiPencil className="h-4 w-4" />
              Editar Red
            </button>
            <Button
              onClick={() => setShowAddMemberModal(true)}
              icon={<HiPlus className="h-4 w-4" />}
              size="lg"
            >
                Agregar Miembro
            </Button>
          </div>
        }
      />

      <GridCard
        grid={myGrid}
        members={members}
        stats={stats}
        isAdmin={false}
        onRemoveMember={handleRemoveMember}
      />

      {/* Modal para editar red */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Editar Mi Red"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Red *
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
              placeholder="Ej: Red Norte"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleCloseModal}
              variant="outline"
              rounded="xl"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              rounded="xl"
              fullWidth
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar miembro */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setMemberEmail("");
          setMemberSearch("");
          setErrors({});
        }}
        title="Agregar Miembro a Mi Red"
        maxWidth="xl"
      >
        <form onSubmit={handleAddMember} className="p-6 space-y-5">
          <div className="relative" ref={searchRef}>
            <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email del Usuario *
            </label>
            <div className="relative">
              <input
                id="memberEmail"
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberEmail(e.target.value);
                  setShowSearchResults(true);
                  setErrors({ ...errors, email: "" });
                }}
                className={`block w-full px-4 py-3 pl-10 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-sky-200 focus:border-sky-300"
                }`}
                placeholder="Buscar por email..."
                required
              />
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => {
                      setMemberEmail(user.email || "");
                      setMemberSearch(user.email || "");
                      setShowSearchResults(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{user.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberEmail("");
                setMemberSearch("");
                setErrors({});
              }}
              variant="outline"
              rounded="xl"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              rounded="xl"
              fullWidth
            >
              {isSubmitting ? "Agregando..." : "Agregar Miembro"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Componente de tarjeta de red
function GridCard({
  grid,
  members,
  stats,
  isAdmin,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  grid: {
    _id: Id<"grids">;
    name: string;
    pastor?: { name?: string; email?: string } | null;
  };
  members?: Array<{
    _id: Id<"users">;
    name?: string;
    email?: string;
  }>;
  stats?: {
    totalMembers: number;
    membersInSchool: number;
    totalGroups: number;
    maleCount: number;
    femaleCount: number;
  };
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: Id<"users">) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Si es admin, obtener datos con queries
  const adminMembers = useQuery(
    api.grids.getGridMembersForAdmin,
    isExpanded && isAdmin && grid._id ? { gridId: grid._id } : "skip"
  );
  const adminStats = useQuery(
    api.grids.getGridStatsForAdmin,
    isExpanded && isAdmin && grid._id ? { gridId: grid._id } : "skip"
  );

  const displayMembers = isAdmin ? adminMembers : members;
  const displayStats = isAdmin ? adminStats : stats;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl">
              <HiGlobeAlt className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{grid.name}</h3>
          </div>
          {grid.pastor && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Pastor:</span> {grid.pastor.name || grid.pastor.email}
              </p>
              {grid.pastor.email && (
                <p className="text-xs text-gray-500">{grid.pastor.email}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción para admin */}
      {isAdmin && (onEdit || onDelete || onAddMember) && (
        <div className="flex gap-2 mb-4 pt-4 border-t border-gray-200">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <HiPencil className="h-4 w-4" />
              Editar
            </button>
          )}
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <HiPlus className="h-4 w-4" />
              Agregar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
            >
              <HiTrash className="h-4 w-4" />
              Eliminar
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl transition-colors"
      >
        {isExpanded ? "Ocultar detalles" : "Ver detalles"}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {displayStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <HiUsers className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-gray-600">Miembros</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{displayStats.totalMembers}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <HiAcademicCap className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-gray-600">En Escuela</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{displayStats.membersInSchool}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <HiUserGroup className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-gray-600">Grupos</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{displayStats.totalGroups}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <HiUsers className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-gray-600">Hombres/Mujeres</p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {displayStats.maleCount} / {displayStats.femaleCount}
                </p>
              </div>
            </div>
          )}

          {displayMembers && displayMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Miembros ({displayMembers.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayMembers.map((member: { _id: Id<"users">; name?: string; email?: string }) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {member.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-gray-600">{member.email}</p>
                    </div>
                    {onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(member._id)}
                        className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover miembro"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Grid;
